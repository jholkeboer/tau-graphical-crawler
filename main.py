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
    print "Level" + str(currentLevel) + " Recursion Limit " + str(recursionLimit)

    results = []

    try:
        parent_links = getPageLinks(startingURL)
        results.extend(parent_links)
    except:
        pass

    if currentLevel < recursionLimit:
        # get page html
        try:
            res = urlfetch.fetch(startingURL)
        except:
            return []

        # parse html tree
        try:
            tree = lxml.html.fromstring(res.content)
        except:
            return []

        # call recursively on each link
        for link in parent_links:
            results.extend(breadthFirstCrawl(link['child'], recursionLimit, currentLevel + 1))

    return results

# def depthFirstCrawl(startingURL, recursionLimit, currentLevel):
#     print "Level" + str(currentLevel) + " Recursion Limit " + str(recursionLimit)

#     results = []

#     try:
#         parent_links = getPageLinks(startingURL)
#         results.extend(parent_links)
#     except:
#         pass
    
#     # if currentLevel < recursionLimit:
#     #     for link in parent_links:
#     #         results.extend(depthFirstCrawl(link['child'], recursionLimit, currentLevel + 1))

#     return results

@app.route('/')
def index():
	return render_template('index.html',content="hello world!")

@app.route('/crawl', methods=['POST'])
def crawl():
    startingURL = request.form.get('startingURL')
    recursionLimit = int(request.form.get('recursionLimit'))
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

    # return unique elements
    result = set(result)

    return json.dumps({'status': 'Ok', 'count': len(result), 'result': result})


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
