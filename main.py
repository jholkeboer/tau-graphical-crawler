import json
import lxml
from flask import Flask, render_template, request
from google.appengine.api import urlfetch
import lxml
from lxml import html
app = Flask(__name__)

def getPageLinks(parentURL):
    res = urlfetch.fetch(parentURL)
    tree = lxml.html.fromstring(res.content)

    links = []
    for node in tree.iter():
        if node.tag == 'a':
            link = node.get('href')
            if link and link.startswith('http'):
                nextLink = {'parent': parentURL, 'child': link}
                print nextLink
                links.append(nextLink)
    return links

def breadthFirstCrawl(startingURL, recursionLimit, currentLevel):
    print "Level" + str(currentLevel)
    
    # see here: http://stackoverflow.com/questions/9762685/using-the-requests-python-library-in-google-app-engine
    # get html tree of starting page
    res = urlfetch.fetch(startingURL)
    tree = lxml.html.fromstring(res.content)
    
    results = getPageLinks(startingURL)
    if currentLevel < recursionLimit:
        current_level_result = results
        for link in current_level_result:
            results.extend(breadthFirstCrawl(link['child'], recursionLimit, currentLevel + 1))
    else:
        return results

    return results

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

    
    if searchType == 'bfs':
        result = breadthFirstCrawl(startingURL, recursionLimit, 0)
    # elif searchType == 'dfs':
    #     result = ""
    else:
        result = []

    return json.dumps({'status': 'Ok', 'count': len(result)})


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
