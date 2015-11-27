import json

def generateMassTable():
    '''
    generate a mass table for the beam companion explorer.
    writes and returns the mass table, a list of dicts keyed as [Z]['A'].
    '''

    # handy variables
    lineLength = 124
    headerLength = 39
    massTable = []
    fid = open("mass.mas12", "r")

    # fast forward through header
    for i in range(headerLength):
        fid.readline()

    # unpack each line
    while True:

        #decode fixed-width columns
        record = fid.readline()
        if record == '':
            break
        N = int(record[6:9])
        Z = int(record[11:14])
        A = N + Z
        mass = record[96:110].replace(' ', '')
        mass = mass.replace('#', '.')
        mass = float(mass)/1000000.

        #pack N, Z, mass into dictionary for beam companion explorer:
        while len(massTable)-1 < Z:
            massTable.append({})

        massTable[Z][str(A)] = mass

    outputTable = open('mass.dict', 'w')
    outputTable.write(json.dumps(massTable))

    return massTable