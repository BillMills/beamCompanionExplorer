## python flask demo

Here's a very simple demo using python & flask to achieve the engineering goals in [this issue](https://github.com/GRIFFINCollaboration/beamCompanionExplorer/issues/2).

### setup:

`sudo pip install flask`

If you don't have pip installed, first install it with 'sudo easy_install pip'

### usage:

 - run `python app.py`
 - visit `http://127.0.0.1:5000/K/50`

### discussion

While it may look a little sad now, we've achieved most of what we set out to do:

 - the `@app.route` decorator contains an example of variable URLs, so we can encode state in the URL.
 - the template in `pydemo/templates` is a fully functional template - and is mostly HTML.
 - all this with about 30 lines of python and one dependency.

Python is a more common language in the lab than JavaScript (so maintenance will be easier with flask than with node), but still offers modern and easy-to-use web frameworks.