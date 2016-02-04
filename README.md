Release History:

version | DOI
--------|------
1.1.0   | [![DOI](https://zenodo.org/badge/3877/GRIFFINCollaboration/beamCompanionExplorer.svg)](https://zenodo.org/badge/latestdoi/3877/GRIFFINCollaboration/beamCompanionExplorer)
1.0.1   | [![DOI](https://zenodo.org/badge/3877/GRIFFINCollaboration/beamCompanionExplorer.svg)](https://zenodo.org/badge/latestdoi/3877/GRIFFINCollaboration/beamCompanionExplorer)
1.0     | [![DOI](https://zenodo.org/badge/doi/10.5281/zenodo.34279.svg)](http://dx.doi.org/10.5281/zenodo.34279)

## Beam Companion Explorer 
A web app for exploring and visualizing beam companions picked up during charge state boosting in radioactive ion beam experiments.

**[See testing status](http://griffincollaboration.github.io/beamCompanionExplorer/tests/tests.html)**

## Dependencies & Setup

This project runs 100% client side; simply open `companionExplorer.html` in the latest Firefox or Chrome locally, or serve from any static page server.

This project uses [Dygraphs](http://dygraphs.com/) for plotting, [Twitter Bootstrap](http://getbootstrap.com/) for layout, and [Ultralight](https://github.com/BillMills/ultralight) and [mustache.js](https://github.com/janl/mustache.js/) for client-side templating and URL management.

## Programmatic Logic

 - All pages in the Beam Companion Explorer generate static plots and isotope lists from lookup tables found in `scripts/datastore.js`; essentially all logic is complete after the chain of calls triggered after pageload.
 - As with all Ultralight projects, pageload proceeds by first loading templates, then generating data to pass to the templates via `auxiliaryCSBdata()` and `auxiliaryFoilData()`, then finally triggering logic via `pageload()`. Any additional logic should fit into the chain of functions called by `pageload()`.
 - As with most GRIFFIN apps, a global `dataStore` object exists to accommodate global variables.

### URL Encoding

The Beam Companion Explorer encodes user selections in the URL query string, so results can be bookmarked and shared more easily. The query string parameters are as follows:

 - **CSB.html and strippingFoil.html**
   - `species`: the chemical symbol corresponding to the beam species of interest.
   - `A`: the atomic mass of the beam species of interest.
 - **strippingFoil.html only**
   - `qOriginal`: the charge state selected after the first charge breeding step.

Note that by filling out this query string by hand, it's possible to jump directly to the results of interest, without clicking through earlier pages.

## Contributing

Contributions are very welcome! If you have an idea, question or comment, please open an issue. If you would like to make a change to the project, please follow these steps:
 - start by opening an issue or empty PR to discuss your ideas
 - please limit individual PRs to less than 500 lines.
 - please encapsulate all new behavior wherever possible in functions of 50 lines or less each.
 - please include unit tests for all new functions wherever possible, to demonstrate correct behavior.

## Citation & Deployment

If you use a result from this project, **be sure to site it using the correct DOI**. This will allow you to go back and reproduce your results later, with the same software version you used originally. To find the correct DOI, look in the footer of the app.

If you push changes to this project onto GRIFFIN's live toolkit, **be sure to update the DOI in the footer and in the table at the top of this file**. To get a new DOI, simply [make a new release via GitHub](https://help.github.com/articles/creating-releases/), then [visit Zenodo](https://zenodo.org/account/settings/github/), sign in with your GitHub credentials, and find this project in the list on that page; clicking on the badge will give you a bunch of options to cut and paste into the appropriate places. Add the markdown one to this document, and the HTML one to the footer.
