import parseMass

class TestClass():
    def setUp(self):

        self.massTable = parseMass.generateMassTable()

    def tearDown(self):

        return 0

    def test_n(self):
        '''
        spot check mass of n - 1st element
        '''
        
        assert isclose(self.massTable[0]['1'], 1.00866491585)
        
    def test_1H(self):
        '''
        spot check mass of 1H - 2nd element
        '''
        
        assert isclose(self.massTable[1]['1'], 1.00782503223)
        
    def test_12C(self):
        '''
        spot check mass of 12C - atomic mass reference
        '''
        
        assert isclose(self.massTable[6]['12'], 12.0)
        
    def test_16Be(self):
        '''
        spot check mass of 16Be
        '''
        
        assert isclose(self.massTable[4]['16'], 16.061672036)

    def test_15Be(self):
        '''
        spot check mass of 15Be - parsing estimated masses
        '''

        assert isclose(self.massTable[4]['15'], 15.053420)

    def test_130Cd(self):
        '''
        spot check mass of 130Cd - widest mass column
        '''

        assert isclose(self.massTable[48]['130'], 129.933940679)
        
    def test_295Ei(self):
        '''
        spot check mass of 295Ei - last element in mass.mas12 
        '''
        assert isclose(self.massTable[118]['295'],295.216240 )
        

def isclose(a, b, rel_tol=1e-09, abs_tol=0.0):
    '''
    fiddly floating point comparisons
    '''
    return abs(a-b) <= max(rel_tol * max(abs(a), abs(b)), abs_tol)
