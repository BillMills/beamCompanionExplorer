from flask import Flask
from flask import render_template
app = Flask(__name__)

# variable routes example:
@app.route('/<element>/<int:atomicNo>')
def show_user_profile(element, atomicNo):
    # show companions for species described in the route
    return render_template('companions.html', species=element, A=atomicNo)

if __name__ == '__main__':
    app.run()
