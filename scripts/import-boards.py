"""Extract only public Kilter LED coordinates from a Grip Connect checkout."""
import json
import pathlib
import subprocess
import sys

repo = pathlib.Path(sys.argv[1])
src = repo / 'examples/aurora/src/data/kilter'
out = pathlib.Path(__file__).resolve().parents[1] / 'site'
load = lambda name: json.loads((src / (name + '.json')).read_text())
holes = {x['id']: x for x in load('holes')}
sets = {x['id']: x['name'] for x in load('sets')}
leds, placements, joins, sizes = map(load, ['leds', 'placements', 'product_sizes_layouts_sets', 'product_sizes'])
boards = []
for layout, pid, family in [(1, 1, 'Original'), (8, 7, 'Homewall')]:
    for size in sorted([x for x in sizes if x['product_id'] == pid and x['is_listed']], key=lambda x: x['position']):
        setids = {x['set_id'] for x in joins if x['layout_id'] == layout and x['product_size_id'] == size['id'] and x['is_listed']}
        pl = {x['hole_id']: x for x in placements if x['layout_id'] == layout and x['set_id'] in setids}
        points = []
        for led in leds:
            if led['product_size_id'] != size['id'] or led['hole_id'] not in pl:
                continue
            h = holes[led['hole_id']]
            if not (size['edge_left'] < h['x'] < size['edge_right'] and size['edge_bottom'] < h['y'] < size['edge_top']):
                continue
            points.append([led['position'], h['x'], h['y'], pl[led['hole_id']]['set_id']])
        assert len({x[0] for x in points}) == len(points)
        boards.append(dict(id=size['id'], layout=layout, family=family, name=size['name'], description=size['description'],
                           bounds=[size['edge_left'], size['edge_right'], size['edge_bottom'], size['edge_top']],
                           sets=[{'id': i, 'name': sets[i]} for i in sorted(setids)], points=sorted(points)))
revision = subprocess.check_output(['git', '-C', str(repo), 'rev-parse', 'HEAD'], text=True).strip()
(out / 'boards.json').write_text(json.dumps({'source': 'https://github.com/Stevie-Ray/hangtime-grip-connect',
                                           'revision': revision, 'boards': boards}, separators=(',', ':')) + '\n')
(out / 'THIRD-PARTY-LICENSE.txt').write_text((repo / 'LICENSE').read_text())
for board in boards:
    print(board['family'], board['name'], board['description'], len(board['points']), 'LEDs')
