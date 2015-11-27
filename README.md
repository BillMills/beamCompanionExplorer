## Beam Companion Explorer 
A web app for exploring and visualizing beam companions picked up during charge state boosting in radioactive ion beam experiments.

**[See testing status](http://griffincollaboration.github.io/beamCompanionExplorer/tests/tests.html)**

## Dependencies & Setup

This project runs 100% client side; simply open `companionExplorer.html` in the latest Firefox or Chrome locally, or serve from any static page server.

This project uses [Dygraphs](http://dygraphs.com/) for plotting, [Twitter Bootstrap](http://getbootstrap.com/) for layout, and [Ultralight](https://github.com/BillMills/ultralight) and [mustache.js](https://github.com/janl/mustache.js/) for client-side templating and URL management.

## Contributing

Contributions are very welcome! If you have an idea, question or comment, please open an issue. If you would like to make a change to the project, please follow these steps:
 - start by opening an issue or empty PR to discuss your ideas
 - please limit individual PRs to less than 500 lines.
 - please encapsulate all new behavior wherever possible in functions of 50 lines or less each.

## Citation & Deployment

If you use a result from this project, **be sure to site it using the correct DOI**. This will allow you to go back and reproduce your results later, with the same version of the software you used originally. To find the correct DOI, look in the footer of the app.

If you push changes to the project onto GRIFFIN's live toolkit, **be sure to update the DOI in the footer**. To get a new DOI, simply [make a new release via GitHub](https://help.github.com/articles/creating-releases/). The DOI badge at the top of this README will automatically update with the new number; copy it into the footer before deploying live.