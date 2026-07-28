# -*- coding: utf-8 -*-
"""提取 PRD Word 文档内容（含表格），保存为 UTF-8 文本文件"""
import docx
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def extract(path, out):
    doc = docx.Document(path)
    lines = []
    # 按文档顺序遍历段落和表格
    from docx.document import Document as _Doc
    from docx.table import Table
    from docx.text.paragraph import Paragraph
    from docx.oxml.ns import qn

    body = doc.element.body
    for child in body.iterchildren():
        if child.tag == qn('w:p'):
            p = Paragraph(child, doc)
            text = p.text.strip()
            if text:
                style = p.style.name if p.style else ''
                if style.startswith('Heading'):
                    lines.append('#' * int(style.replace('Heading ', '') or '1') + ' ' + text)
                else:
                    lines.append(text)
        elif child.tag == qn('w:tbl'):
            tbl = Table(child, doc)
            lines.append('')
            for row in tbl.rows:
                cells = [c.text.strip().replace('\n', ' ') for c in row.cells]
                lines.append('| ' + ' | '.join(cells) + ' |')
            lines.append('')
    with open(out, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(f'saved {out}, {len(lines)} lines')

extract(r'E:\AIshubo\mePRD\word\寻仙 - 初始之地野怪系统 PRD+技术方案.docx',
        r'e:\ziji-xiaochengxu\scripts\prd_monster.txt')
extract(r'E:\AIshubo\mePRD\word\寻仙·装备系统 PRD+技术方案.docx',
        r'e:\ziji-xiaochengxu\scripts\prd_equipment.txt')
