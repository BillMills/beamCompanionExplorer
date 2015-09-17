import json

json_data=open('raw.json').read()

data = json.loads(json_data)

elements = {}

for elt in data['PERIODIC_TABLE']['ATOM']:

	symbol = elt['SYMBOL']
	Z = elt['ATOMIC_NUMBER']

	elements[symbol] = {'Z': Z}


f = open('elements.json', 'w')
f.write(json.dumps(elements))