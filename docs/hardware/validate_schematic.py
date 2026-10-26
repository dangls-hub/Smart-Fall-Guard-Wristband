"""Check SP1-HW-01 connectivity in the editable EasyEDA Rev B source."""
import json
from pathlib import Path

folder = Path(__file__).resolve().parent
document = json.loads((folder / 'SmartFallGuard_RevB.json').read_text(encoding='utf-8'))
pins, labels, segments, points = {}, [], [], set()
references = set()
for sheet_index, schematic in enumerate(document['schematics']):
    for shape in schematic['dataStr']['shape']:
        if shape.startswith('LIB~'):
            parts = shape.split('#@$')
            reference = next(p.split('~')[12] for p in parts if p.startswith('T~P~'))
            assert reference not in references, f'Duplicate reference: {reference}'
            references.add(reference)
            for part in parts:
                if part.startswith('P~'):
                    number = part.split('^^')[0].split('~')[3]
                    xy = tuple(map(float, part.split('^^')[1].split('~')))
                    point = (sheet_index, *xy)
                    pins[f'{reference}.{number}'] = point
                    points.add(point)
        elif shape.startswith('W~'):
            coordinates = list(map(float, shape.split('~')[1].split()))
            vertices = [(sheet_index, x, y) for x, y in zip(coordinates[::2], coordinates[1::2])]
            points.update(vertices)
            segments.extend(zip(vertices, vertices[1:]))
        elif shape.startswith('N~'):
            attributes = shape.split('~')
            point = (sheet_index, float(attributes[1]), float(attributes[2]))
            points.add(point)
            labels.append((attributes[5], point))

parent = {point: point for point in points}


def root(point):
    while parent[point] != point:
        parent[point] = parent[parent[point]]
        point = parent[point]
    return point


def union(a, b):
    parent[root(a)] = root(b)


for a, b in segments:
    for point in points:
        if point[0] != a[0]:
            continue
        within = min(a[1], b[1]) <= point[1] <= max(a[1], b[1]) and min(a[2], b[2]) <= point[2] <= max(a[2], b[2])
        collinear = (point[1] - a[1]) * (b[2] - a[2]) == (point[2] - a[2]) * (b[1] - a[1])
        if within and collinear:
            union(a, point)
named = {}
for name, point in labels:
    if name in named:
        union(point, named[name])
    else:
        named[name] = point
groups = {}
for name, point in pins.items():
    groups.setdefault(root(point), set()).add(name)

expected = {
    '+3V3': {'JP1.2', 'U1.3V3', 'U2.1', 'R4.1', 'R5.2', 'C1.1', 'BZ1.+'},
    'GND': {'J1.GND', 'U3.GND', 'BT1.-', 'U4.GND', 'U1.GND', 'U2.2', 'U2.7', 'C1.2', 'SW1.2', 'D1.K', 'Q1.E', 'R2.2'},
    'USB5V': {'J1.VBUS', 'U3.IN'},
    'BAT+': {'U3.BAT', 'BT1.+'},
    'CHG_SYS': {'U3.OUT', 'SW2.1'},
    'REG_IN': {'SW2.2', 'U4.VIN', 'U4.EN'},
    'REG_3V3': {'U4.VOUT', 'JP1.1'},
    'SDA': {'U1.21', 'U2.4', 'R4.2'},
    'SCL': {'U1.22', 'U2.3', 'R5.1'},
    'CANCEL': {'U1.18', 'SW1.1'},
    'LED_CTRL': {'U1.23', 'R3.1'},
    'LED_ANODE': {'R3.2', 'D1.A'},
    'BUZZER_CTRL': {'U1.19', 'R1.1'},
    'Q1_BASE': {'R1.2', 'Q1.B', 'R2.1'},
    'Q1_COLLECTOR': {'BZ1.-', 'Q1.C'},
    'NC_U2_XDA': {'U2.5'},
    'NC_U2_XCL': {'U2.6'},
    'NC_U2_INT': {'U2.8'},
}
for name, wanted in expected.items():
    actual = groups[root(pins[next(iter(wanted))])]
    assert actual == wanted, f'{name}: expected {wanted}, found {actual}'
    if name in named:
        assert groups[root(named[name])] == wanted, f'Incorrect label: {name}'
assert len(groups) == len(expected), 'Unexpected isolated pins or extra nets'
print(f'PASS: {len(document["schematics"])} sheets, {len(references)} symbols, '
      f'{len(pins)} pins and {len(groups)} nets match SP1-HW-01 Rev B.')
