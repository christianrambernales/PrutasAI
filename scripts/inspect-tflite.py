#!/usr/bin/env python3
"""Report LiteRT tensor and signature metadata without running inference.

Stdout contract (JSON, schema version 1):
  {"schemaVersion": 1,
   "inputs": [{"name": str, "shape": [int, ...],
               "shapeSignature": [int, ...], "dtype": str}, ...],
   "outputs": [{...}, ...],
   "signatures": [{"key": str,
                   "inputs": {signature_alias: tensor_detail_name, ...},
                   "outputs": {signature_alias: tensor_detail_name, ...}}, ...]}

The signature input/output maps come from LiteRT SignatureRunner metadata.
This script does not allocate model tensors, set inputs, create a runner call,
or invoke the interpreter. The caller must enforce a hard subprocess timeout:
LiteRT's native model-loading/introspection calls cannot be interrupted safely
from Python if malformed input causes a native hang. Interpreter CPU threading
and emitted metadata are capped here to keep normal inspection bounded.
"""

from __future__ import annotations

import argparse
import contextlib
import json
import operator
import os
import re
import sys
from collections.abc import Mapping, Sequence
from pathlib import Path
from typing import Any


SCHEMA_VERSION = 1
MAX_COLLECTION_ITEMS = 4096
MAX_TENSOR_RANK = 64
MAX_NAME_LENGTH = 4096
MAX_JSON_BYTES = 1024 * 1024
_DTYPE_PATTERN = re.compile(r"^[A-Za-z][A-Za-z0-9_]*$")


class InspectionFailure(Exception):
    """A sanitized failure safe to show in build output."""


@contextlib.contextmanager
def _discard_runtime_output() -> Any:
    """Prevent native LiteRT logs from corrupting JSON or exposing paths."""
    sys.stdout.flush()
    sys.stderr.flush()
    saved_stdout = os.dup(1)
    saved_stderr = os.dup(2)
    null_output = os.open(os.devnull, os.O_WRONLY)
    try:
        os.dup2(null_output, 1)
        os.dup2(null_output, 2)
        yield
    finally:
        os.dup2(saved_stdout, 1)
        os.dup2(saved_stderr, 2)
        os.close(null_output)
        os.close(saved_stdout)
        os.close(saved_stderr)


def _safe_name(value: Any, description: str) -> str:
    if not isinstance(value, str) or not value or len(value) > MAX_NAME_LENGTH:
        raise InspectionFailure(f"model contains invalid {description} metadata")
    return value


def _shape(value: Any, description: str) -> list[int]:
    if hasattr(value, "tolist"):
        value = value.tolist()
    if not isinstance(value, (list, tuple)) or len(value) > MAX_TENSOR_RANK:
        raise InspectionFailure(f"model contains invalid {description} metadata")

    dimensions: list[int] = []
    for dimension in value:
        if isinstance(dimension, bool):
            raise InspectionFailure(f"model contains invalid {description} metadata")
        try:
            dimensions.append(operator.index(dimension))
        except (TypeError, ValueError, OverflowError):
            raise InspectionFailure(f"model contains invalid {description} metadata") from None
    return dimensions


def _tensor_details(details: Any, description: str) -> list[dict[str, Any]]:
    if not isinstance(details, Sequence) or isinstance(details, (str, bytes)):
        raise InspectionFailure(f"LiteRT returned invalid {description} metadata")
    if len(details) > MAX_COLLECTION_ITEMS:
        raise InspectionFailure("model metadata exceeds inspection limits")

    tensors: list[dict[str, Any]] = []
    for detail in details:
        if not isinstance(detail, Mapping):
            raise InspectionFailure(f"LiteRT returned invalid {description} metadata")

        name = _safe_name(detail.get("name"), f"{description} tensor name")
        shape = _shape(detail.get("shape"), f"{description} tensor shape")
        dtype_value = detail.get("dtype")
        dtype = getattr(dtype_value, "name", None)
        if not isinstance(dtype, str):
            dtype = getattr(dtype_value, "__name__", None)
        if not isinstance(dtype, str) or not _DTYPE_PATTERN.fullmatch(dtype):
            raise InspectionFailure(f"model contains invalid {description} tensor dtype metadata")

        tensor: dict[str, Any] = {"name": name, "shape": shape, "dtype": dtype}
        if "shape_signature" in detail:
            tensor["shapeSignature"] = _shape(
                detail["shape_signature"], f"{description} tensor shape signature"
            )
        tensors.append(tensor)
    return tensors


def _signature_details(interpreter: Any) -> list[dict[str, Any]]:
    signature_list = interpreter.get_signature_list()
    if not isinstance(signature_list, Mapping):
        raise InspectionFailure("LiteRT returned invalid signature metadata")
    if len(signature_list) > MAX_COLLECTION_ITEMS:
        raise InspectionFailure("model metadata exceeds inspection limits")

    signatures: list[dict[str, Any]] = []
    for key in sorted(signature_list):
        signature_key = _safe_name(key, "signature key")
        runner = interpreter.get_signature_runner(signature_key)
        bindings: dict[str, dict[str, str]] = {}
        for direction, method_name in (
            ("inputs", "get_input_details"),
            ("outputs", "get_output_details"),
        ):
            details_method = getattr(runner, method_name, None)
            if not callable(details_method):
                raise InspectionFailure("LiteRT runtime does not expose signature tensor details")
            tensor_map = details_method()
            if not isinstance(tensor_map, Mapping) or len(tensor_map) > MAX_COLLECTION_ITEMS:
                raise InspectionFailure("model metadata exceeds inspection limits")

            mapped: dict[str, str] = {}
            for alias in sorted(tensor_map):
                alias_name = _safe_name(alias, f"signature {direction} alias")
                tensor = tensor_map[alias]
                if not isinstance(tensor, Mapping):
                    raise InspectionFailure("LiteRT returned invalid signature tensor metadata")
                tensor_name = _safe_name(tensor.get("name"), "signature tensor name")
                mapped[alias_name] = tensor_name
            bindings[direction] = mapped

        signatures.append({
            "key": signature_key,
            "inputs": bindings["inputs"],
            "outputs": bindings["outputs"],
        })
    return signatures


def inspect_model(model_path: Path) -> dict[str, Any]:
    try:
        if not model_path.is_file() or model_path.stat().st_size == 0:
            raise InspectionFailure("model file is missing, unreadable, or empty")
    except OSError:
        raise InspectionFailure("model file is missing, unreadable, or empty") from None

    try:
        with _discard_runtime_output():
            try:
                from ai_edge_litert.interpreter import Interpreter, OpResolverType
            except ModuleNotFoundError:
                raise InspectionFailure(
                    "LiteRT inspector dependency is unavailable; install the pinned inspection requirements"
                ) from None
            except (ImportError, OSError):
                raise InspectionFailure("LiteRT inspector runtime is unavailable") from None

            interpreter = Interpreter(
                model_path=str(model_path),
                num_threads=1,
                experimental_op_resolver_type=OpResolverType.BUILTIN_WITHOUT_DEFAULT_DELEGATES,
            )
            result = {
                "schemaVersion": SCHEMA_VERSION,
                "inputs": _tensor_details(interpreter.get_input_details(), "input"),
                "outputs": _tensor_details(interpreter.get_output_details(), "output"),
                "signatures": _signature_details(interpreter),
            }
            del interpreter
            return result
    except InspectionFailure:
        raise
    except Exception:
        # LiteRT exceptions can embed file paths or details from untrusted model
        # data. Do not expose them or a traceback in build logs.
        raise InspectionFailure("LiteRT could not inspect the model") from None


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("model", type=Path, help="path to the declared .tflite model")
    args = parser.parse_args(argv)

    try:
        result = inspect_model(args.model)
        output = json.dumps(result, ensure_ascii=True, sort_keys=True, separators=(",", ":"))
        if len(output.encode("utf-8")) > MAX_JSON_BYTES:
            raise InspectionFailure("model metadata exceeds inspection limits")
        sys.stdout.write(output + "\n")
        return 0
    except InspectionFailure as failure:
        sys.stderr.write(f"inspect-tflite: {failure}\n")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
