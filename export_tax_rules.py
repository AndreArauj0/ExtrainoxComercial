from __future__ import annotations

import json
from pathlib import Path

import openpyxl


SOURCE = Path(r"C:\Users\andre\OneDrive\Área de Trabalho\Cópia de Desenvolvimento Orçamentos.xlsx")
TARGET = Path("app/tax-rules.js")


def as_float(value):
    if value is None:
        return 0
    return float(value)


def main():
    wb = openpyxl.load_workbook(SOURCE, data_only=True)
    ws = wb["Tabela Impostos Completa"]
    rules = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        company, uf, ncm, description, icms, icms_base, ipi, pis_cofins = row[:8]
        if not company or not uf or not ncm:
            continue
        rules.append(
            {
                "company": str(company).strip(),
                "uf": str(uf).strip(),
                "ncm": str(ncm).strip(),
                "description": str(description or "").strip(),
                "icms": as_float(icms),
                "icmsBase": as_float(icms_base),
                "ipi": as_float(ipi),
                "pisCofins": as_float(pis_cofins),
            }
        )

    content = "window.TAX_RULES = "
    content += json.dumps(rules, ensure_ascii=False, separators=(",", ":"))
    content += ";\n"
    TARGET.write_text(content, encoding="utf-8")
    print(json.dumps({"rules": len(rules), "target": str(TARGET)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
