"""Render every value in the disease/remedy and source YAML drafts into a DOCX."""

import json
import sys
from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION_START
from docx.enum.style import WD_STYLE_TYPE
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


def display_name(key):
    return key.replace('_', ' ').replace('FPA', 'FPA').title().replace('Fpa', 'FPA').replace('Phi', 'PHI').replace('Rei', 'REI').replace('En', 'EN').replace('Fil', 'FIL').replace('Id', 'ID').replace('Url', 'URL')


def value_text(value):
    if value is None:
        return 'Not provided'
    if isinstance(value, bool):
        return 'Yes' if value else 'No'
    if isinstance(value, list):
        return '\n'.join(value_text(item) for item in value) if value else 'None'
    if isinstance(value, dict):
        return '\n'.join(f'{display_name(key)}: {value_text(item)}' for key, item in value.items())
    if value == '':
        return 'Blank'
    return str(value)


def shade(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:fill'), fill)
    tc_pr.append(shd)


def set_cell_text(cell, text, bold=False):
    cell.text = ''
    paragraph = cell.paragraphs[0]
    paragraph.paragraph_format.space_after = Pt(0)
    run = paragraph.add_run(text)
    run.bold = bold
    run.font.size = Pt(8.5)


def add_field_table(document, record):
    table = document.add_table(rows=0, cols=2)
    table.style = 'Table Grid'
    for key, value in record.items():
        cells = table.add_row().cells
        set_cell_text(cells[0], display_name(key), bold=True)
        set_cell_text(cells[1], value_text(value))
        shade(cells[0], 'EAF2F8')
    document.add_paragraph()


def add_bullets(document, values):
    for value in values:
        document.add_paragraph(value, style='List Bullet')


def main(spec_path):
    spec = json.loads(Path(spec_path).read_text(encoding='utf-8'))
    disease_draft = spec['diseaseDraft']
    source_draft = spec['sourceDraft']
    document = Document()
    section = document.sections[0]
    section.top_margin = Inches(0.6)
    section.bottom_margin = Inches(0.6)
    section.left_margin = Inches(0.65)
    section.right_margin = Inches(0.65)

    styles = document.styles
    styles['Normal'].font.name = 'Aptos'
    styles['Normal'].font.size = Pt(9.5)
    for style_name, size, color in [('Title', 20, '1F4E79'), ('Heading 1', 15, '1F4E79'), ('Heading 2', 12, '2F5597'), ('Heading 3', 10.5, '2F5597')]:
        style = styles[style_name]
        style.font.name = 'Aptos Display'
        style.font.size = Pt(size)
        style.font.color.rgb = RGBColor.from_string(color)

    title = document.add_paragraph(style='Title')
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title.add_run('PrutasAI Disease-Remedy Agriculturist Review')
    subtitle = document.add_paragraph()
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    subtitle.add_run('Complete YAML rendering for expert review').italic = True

    notice = document.add_paragraph()
    notice.add_run('Draft-only safety notice. ').bold = True
    notice.add_run('This document reproduces every field from knowledge/disease-remedy-draft.yaml and knowledge/sources-draft.yaml. It is not an approved agricultural dataset or pesticide recommendation. All expert-review statuses remain as recorded in the YAML.')

    document.add_heading('Draft metadata', level=1)
    add_field_table(document, disease_draft.get('draft_metadata', {}))

    relationships = disease_draft.get('relationships', [])
    document.add_heading(f'Relationship records ({len(relationships)})', level=1)
    document.add_paragraph('Each table contains every field in its YAML relationship record. Reviewer decisions are intentionally left blank for the qualified reviewer.')
    for index, record in enumerate(relationships, start=1):
        title = f"R{index:02d}. {record.get('fruit', 'Unknown')} - {record.get('disease_name_en', record.get('disease_key', 'Unknown'))} - {record.get('affected_plant_part', 'Unknown plant part')}"
        document.add_heading(title, level=2)
        add_field_table(document, record)
        document.add_paragraph('Reviewer decision: [ ] approved    [ ] approved with revision    [ ] rejected')
        document.add_paragraph('Reviewer comments: ____________________________________________________________________________')

    leads = disease_draft.get('pesticide_regulatory_leads_not_recommendations', [])
    document.add_heading(f'FPA regulatory leads, not treatment recommendations ({len(leads)})', level=1)
    document.add_paragraph('These records are reproduced from the YAML. They do not override the treatment wording or the pesticide gate in the draft metadata.')
    for index, record in enumerate(leads, start=1):
        document.add_heading(f"Lead {index:02d}. {record.get('fruit', 'Unknown')} - {record.get('disease_name_en', 'Unknown')}", level=2)
        add_field_table(document, record)

    excluded = disease_draft.get('excluded_relationships', [])
    document.add_heading(f'Excluded relationships ({len(excluded)})', level=1)
    for index, record in enumerate(excluded, start=1):
        document.add_heading(f'Excluded item {index:02d}', level=2)
        add_field_table(document, record)

    sources = source_draft.get('sources', [])
    document.add_heading(f'Source registry ({len(sources)})', level=1)
    document.add_paragraph('Each source entry below is reproduced from knowledge/sources-draft.yaml.')
    for source in sources:
        document.add_heading(source.get('id', 'Source without ID'), level=2)
        add_field_table(document, source)

    document.add_heading('Completeness statement', level=1)
    document.add_paragraph(f'This rendering includes {len(disease_draft.get("draft_metadata", {}))} draft-metadata fields, {len(relationships)} relationship records, {len(leads)} regulatory-lead records, {len(excluded)} excluded-relationship records, and {len(sources)} source records. Fields with blank or absent YAML values are labelled Blank or Not provided rather than omitted.')

    document.save(spec['outputPath'])

    rendered = Document(spec['outputPath'])
    rendered_cells = '\n'.join(
        cell.text
        for table in rendered.tables
        for row in table.rows
        for cell in row.cells
    )
    missing = []

    def verify_values(value, path='root'):
        if isinstance(value, dict):
            for key, child in value.items():
                verify_values(child, f'{path}.{key}')
        elif isinstance(value, list):
            for index, child in enumerate(value):
                verify_values(child, f'{path}[{index}]')
        else:
            expected = value_text(value)
            if expected not in rendered_cells:
                missing.append(f'{path}: {expected}')

    verify_values(disease_draft, 'disease-remedy-draft.yaml')
    verify_values(source_draft, 'sources-draft.yaml')
    if missing:
        raise RuntimeError('Generated DOCX is missing YAML values:\n' + '\n'.join(missing))

    print(f"Created {spec['outputPath']}")
    print('Verified every YAML scalar value is present in the DOCX tables.')


if __name__ == '__main__':
    main(sys.argv[1])
