# IndiAves Curation Engine

<img src="https://imgur.com/5sWNZhl.png"/>
IndiAves is a curated account which re-tweets pictures of birds, butterflies and sometimes (rarely) other animals which use the #IndiAves hashtag. They also have special events such as #TitliTuesday or #BrownBirds which focus on special occasions or themes. There are people behind this account who retweet almost every single relevant (only avian or etymological) tweet using the #IndiAves manually at set times during the day. While the number of net tweets is reduced, due to the huge volume of the source material (people using #IndiAves) the curation aspect of the account is significantly reduced.
The aim of this project is to collect the tweets using the #IndiAves hashtag, index them dynamically, classify the birds scientifically and make the collection consistently searchable and allow for the system to retrieve a curated list of birds.
The project as of right now is hosted on a GCP Compute instance and can be used by anyone with an internet connection. The project uses NodeJS Express, Pyterrier and Flask as its core components.

This README.md is to note steps to run the project locally. Please use the Google Cloud links if you do not intend to run this locally. 

<img src="https://i.imgur.com/0MfOw4z.png"/>

[V1 link](http://34.71.21.96:6500/search/v1?count=5&dayFrom=2022-11-01&dayTo=2022-11-15&search=parakeet) 

[V2 link](http://34.71.21.96:6500/search/v2?count=5&dayFrom=2022-11-01&dayTo=2022-11-15&search=parakeet)

The web endpoints are simple HTTP endpoints which take a couple of query parameters and returns an html page with the necessary data. The query params are detailed below:
```
count : Number of search results you want (Please do not go beyond 20 or the HTML page will be very slow to load)
dayFrom, dayTo : Use the parametes to set the date range of the returned results (Example: 2022-11-21)
search: This is your search query. Enter a text query here. (Example: osprey)
```

## How to run the two necessary server to see the web pages?

You will need [Node](https://nodejs.org/en/a) and [Python 3.10](https://www.python.org/) in your environment.

Go into the code directory and open any terminal. Run the following commands to install the prerequisite packages

#### For Node dependencies
```
npm install
```

#### For Python dependencies

```
pip install python-terrier
pip install pandas
pip install thefuzz
pip install flask
```

### Running the web servers

#### The Node component

```
node index.mjs
```

#### The Flask (Python) component

```
flask --app search.py run
```

You can access the two local search endpoints by visiting

1. [V1 Endpoint](http://127.0.0.1:3000/search/v1?count=5&dayFrom=2022-10-01&dayTo=2022-12-31&search=osprey) -- Uses pure Node and Javascript for search
2. [V2 Endpoint](http://127.0.0.1:3000/search/v2?count=5&dayFrom=2022-10-01&dayTo=2022-12-31&search=osprey) -- Uses Terrier and modified BM25 for search

Incase of any errors, please reach out to prithvid@umich.edu
