from flask import Flask, render_template, request
import json
from google.appengine.api import urlfetch
import lxml
from lxml import html
app = Flask(__name__)


@app.route('/')
def index():
	return render_template('index.html',content="hello world!")

@app.route('/crawl', methods=['POST'])
def crawl():
    startingURL = request.form.get('startingURL')
    recursionLimit = request.form.get('recursionLimit')
    searchType = request.form.get('searchType')
    
    print startingURL
    print recursionLimit
    print searchType

    # see here: http://stackoverflow.com/questions/9762685/using-the-requests-python-library-in-google-app-engine
    res = urlfetch.fetch(startingURL)
    tree = lxml.html.fromstring(res.content)

    links = []
    for node in tree.iter():
        if node.tag == 'a':
            link = node.get('href')
            if link:
                links.append(link)

    return json.dumps({'status': 'Ok', 'links': links})


@app.errorhandler(404)
def page_not_found(e):
    """Return a custom 404 error."""
    return 'Sorry, Nothing at this URL.', 404


@app.errorhandler(500)
def application_error(e):
    """Return a custom 500 error."""
    return 'Sorry, unexpected error: {}'.format(e), 500

if __name__ == '__main__':
	app.run(host='127.0.0.1', port=8080, debug=True)
