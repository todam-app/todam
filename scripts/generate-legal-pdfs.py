"""Génère les archives PDF des documents juridiques depuis leurs sources Markdown."""

from __future__ import annotations

import os
import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageTemplate,
    Paragraph,
)

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "apps" / "todam" / "public" / "legal"
DOCUMENTS = {
    "conditions-utilisation-v1.0.0.md": "cgu-todam-v1.0.0.pdf",
    "confidentialite-v1.0.0.md": "confidentialite-todam-v1.0.0.pdf",
    "mentions-legales-v1.0.0.md": "mentions-legales-todam-v1.0.0.pdf",
    "suppression-compte-v1.0.0.md": "suppression-compte-todam-v1.0.0.pdf",
}
TOKENS = {
    "{{LEGAL_OPERATOR_NAME}}": "LEGAL_OPERATOR_NAME",
    "{{LEGAL_SIREN}}": "LEGAL_SIREN",
    "{{LEGAL_SIRET}}": "LEGAL_SIRET",
    "{{LEGAL_RNE_REGISTRATION_DATE}}": "LEGAL_RNE_REGISTRATION_DATE",
    "{{LEGAL_ACTIVITY_START_DATE}}": "LEGAL_ACTIVITY_START_DATE",
    "{{LEGAL_LEGAL_FORM}}": "LEGAL_LEGAL_FORM",
    "{{LEGAL_ACTIVITY}}": "LEGAL_ACTIVITY",
    "{{LEGAL_APE}}": "LEGAL_APE",
    "{{LEGAL_ADDRESS}}": "LEGAL_ADDRESS",
    "{{LEGAL_PHONE}}": "LEGAL_PHONE",
    "{{PRIMARY_HOST_NAME}}": "PRIMARY_HOST_NAME",
    "{{PRIMARY_HOST_ADDRESS}}": "PRIMARY_HOST_ADDRESS",
    "{{PRIMARY_HOST_URL}}": "PRIMARY_HOST_URL",
    "{{OBJECT_HOST_NAME}}": "OBJECT_HOST_NAME",
    "{{OBJECT_HOST_ADDRESS}}": "OBJECT_HOST_ADDRESS",
    "{{OBJECT_HOST_URL}}": "OBJECT_HOST_URL",
}


def load_local_environment() -> None:
    env_file = ROOT / ".env"
    if not env_file.exists():
        return
    for raw_line in env_file.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        name = name.strip()
        value = value.strip().strip("\"'")
        if name:
            os.environ.setdefault(name, value)


def register_fonts() -> tuple[str, str]:
    regular = Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts" / "arial.ttf"
    bold = Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts" / "arialbd.ttf"
    if regular.exists() and bold.exists():
        pdfmetrics.registerFont(TTFont("TodamSans", str(regular)))
        pdfmetrics.registerFont(TTFont("TodamSans-Bold", str(bold)))
        return "TodamSans", "TodamSans-Bold"
    return "Helvetica", "Helvetica-Bold"


REGULAR_FONT, BOLD_FONT = register_fonts()


def resolve_tokens(markdown: str) -> tuple[str, bool]:
    draft = False
    for token, environment_name in TOKENS.items():
        value = os.environ.get(environment_name)
        if not value:
            draft = True
            value = f"[{environment_name} À CONFIGURER]"
        markdown = markdown.replace(token, value)
    return markdown, draft


def inline_markup(text: str) -> str:
    text = re.sub(r"\[([^\]]+)\]\(mailto:[^)]+\)", r"\1", text)
    escaped = (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )
    return re.sub(r"`([^`]+)`", r"<font name='Courier'>\1</font>", escaped)


def build_pdf(source: Path, destination: Path) -> None:
    markdown, draft = resolve_tokens(source.read_text(encoding="utf-8"))
    if draft and os.environ.get("LEGAL_RELEASE_READY") == "true":
        raise RuntimeError(
            "Publication PDF bloquée : des coordonnées juridiques sont manquantes."
        )
    styles = getSampleStyleSheet()
    body = ParagraphStyle(
        "TodamBody",
        parent=styles["BodyText"],
        fontName=REGULAR_FONT,
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor("#24211E"),
        spaceAfter=3 * mm,
    )
    title = ParagraphStyle(
        "TodamTitle",
        parent=body,
        fontName=BOLD_FONT,
        fontSize=22,
        leading=27,
        textColor=colors.HexColor("#151515"),
        spaceAfter=7 * mm,
    )
    heading = ParagraphStyle(
        "TodamHeading",
        parent=body,
        fontName=BOLD_FONT,
        fontSize=13,
        leading=17,
        textColor=colors.HexColor("#151515"),
        spaceBefore=4 * mm,
        spaceAfter=2 * mm,
    )
    bullet = ParagraphStyle(
        "TodamBullet",
        parent=body,
        leftIndent=5 * mm,
        firstLineIndent=-3 * mm,
        bulletIndent=0,
    )
    draft_style = ParagraphStyle(
        "TodamDraft",
        parent=body,
        alignment=TA_CENTER,
        fontName=BOLD_FONT,
        fontSize=10,
        textColor=colors.HexColor("#A1261A"),
        borderColor=colors.HexColor("#A1261A"),
        borderWidth=0.5,
        borderPadding=4,
        spaceAfter=6 * mm,
    )

    page_width, page_height = A4
    frame = Frame(
        22 * mm,
        20 * mm,
        page_width - 44 * mm,
        page_height - 38 * mm,
        id="content",
    )

    def decorate(canvas, document):
        canvas.saveState()
        canvas.setFont(REGULAR_FONT, 8)
        canvas.setFillColor(colors.HexColor("#6F6B64"))
        canvas.drawString(22 * mm, 10 * mm, "Todam — document juridique versionné")
        canvas.drawRightString(
            page_width - 22 * mm,
            10 * mm,
            f"Page {document.page}",
        )
        canvas.restoreState()

    document = BaseDocTemplate(
        str(destination),
        pagesize=A4,
        title=markdown.splitlines()[0].removeprefix("# "),
        author="Todam",
        subject="Document juridique versionné",
        creator="Todam legal PDF generator",
        leftMargin=22 * mm,
        rightMargin=22 * mm,
        topMargin=18 * mm,
        bottomMargin=20 * mm,
    )
    document.addPageTemplates([PageTemplate(id="legal", frames=[frame], onPage=decorate)])

    story = []
    if draft:
        story.append(
            Paragraph(
                "BROUILLON TECHNIQUE — coordonnées à configurer avant publication",
                draft_style,
            )
        )
    paragraph_lines: list[str] = []

    def flush_paragraph() -> None:
        if paragraph_lines:
            story.append(Paragraph(inline_markup(" ".join(paragraph_lines)), body))
            paragraph_lines.clear()

    for raw_line in markdown.splitlines():
        line = raw_line.strip()
        if not line:
            flush_paragraph()
        elif line.startswith("# "):
            flush_paragraph()
            story.append(Paragraph(inline_markup(line[2:]), title))
        elif line.startswith("## "):
            flush_paragraph()
            story.append(Paragraph(inline_markup(line[3:]), heading))
        elif line.startswith("- "):
            flush_paragraph()
            story.append(
                Paragraph(inline_markup(line[2:]), bullet, bulletText="•")
            )
        else:
            paragraph_lines.append(line)
    flush_paragraph()
    document.build(story)

    if destination.stat().st_size < 5_000:
        raise RuntimeError(f"Le PDF généré semble incomplet : {destination}")


def main() -> None:
    load_local_environment()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for source_name, output_name in DOCUMENTS.items():
        build_pdf(
            ROOT / "docs" / "legal" / source_name,
            OUTPUT / output_name,
        )
        print(OUTPUT / output_name)


if __name__ == "__main__":
    main()
