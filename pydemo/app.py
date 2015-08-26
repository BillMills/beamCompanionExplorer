from flask import Flask, make_response
from flask import render_template
from matplotlib.backends.backend_agg import FigureCanvasAgg as FigureCanvas
from matplotlib.figure import Figure

import random
import StringIO

app = Flask(__name__)

@app.route('/plot.png')
def acceptancePlot():
    '''
    generate a png acceptance plot.
    '''

    fig = Figure()
    axis = fig.add_subplot(1, 1, 1)

    xs = range(100)
    ys = [random.randint(1, 50) for x in xs]

    axis.plot(xs, ys)
    canvas = FigureCanvas(fig)
    output = StringIO.StringIO()
    canvas.print_png(output)
    response = make_response(output.getvalue())
    response.mimetype = 'image/png'
    return response

# variable routes example:
@app.route('/<element>/<int:atomicNo>')
def show_element_companions(element, atomicNo):
    # show companions for species described in the route
    return render_template('companions.html', species=element, A=atomicNo)

if __name__ == '__main__':
    app.run()
