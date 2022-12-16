import pyterrier as pt
import json
import pandas as pd
import math
from thefuzz import process
import math as Math
from flask import Flask
import traceback
import datetime

app = Flask(__name__)

thesaurus = None

# loading and preparing annotation data
qrel_df = pd.read_csv('terrier_relevance.csv')
qrel_df = qrel_df[['docno', 'label', 'query', 'qid']]
topics_df = qrel_df[['qid', 'query']].drop_duplicates().astype(
    {'qid': 'str'}).reset_index()
qrel_df = qrel_df[['qid', 'docno', 'label']].astype(
    {'qid': 'str', 'docno': 'str'})


def load_thesaurus():
    if (thesaurus is None):
        with open('./thesaurus.json') as file:
            return json.load(file)
    else:
        return thesaurus


def load_data():
    with open('./tweets.json') as file:
        return json.load(file)


def expand_query(query):
    thesaurus = load_thesaurus()
    expansion_key = process.extractOne(query, thesaurus.keys())
    # print(expansion_key)
    if (expansion_key[1] >= 80):
        return query + " " + " ".join(thesaurus[expansion_key[0]])
    print(query)
    return query


def create_map(data):
    map = {}
    for (key, value) in data.items():
        map[str(value['docno'])] = key
    return map


def bm25_tuning_helper(k1=1.2, k3=8, b=0.25):
    def bm25_weighting_tuned(keyFreq, posting, entryStats, collStats):
        normal_qtf = (k3+1)*keyFreq/(k3 + keyFreq)
        normal_tf = (k1+1)*posting.getFrequency()/((k1*(1-b+(b*posting.getDocumentLength() /
                                                             collStats.averageDocumentLength)))+posting.getFrequency())
        normal_idf = math.log(
            (collStats.numberOfDocuments-entryStats.getDocumentFrequency()+0.5)/(entryStats.getDocumentFrequency()+0.5))
        return normal_idf*normal_tf*normal_qtf
    return bm25_weighting_tuned

# # no expand doc


# def enrich_text0(arr):
#     res = list()
#     for item in arr:
#         item['text'] = item['text'].replace('#', ' ').replace('@', ' ').lower()
#         res.append(item)
#     return res

# # no expand doc with addition to document body


# def enrich_text1(arr):
#     res = list()
#     for item in arr:
#         item['text'] = item['text'].replace('#', ' ').replace('@', ' ').lower()+' '+' '.join(item['classifiers'])
#         res.append(item)
#     return res

# no expand doc with addition to document metadata

def enrich_text2(arr):
    res = list()
    for item in arr:
        item['text'] = item['text'].replace('#', ' ').replace('@', ' ').replace(u'\u201c', '"').replace(u'\u201d', '"').replace(u'\u2018', '\'').replace(u'\u2019', '\'').lower()
        item['classifier_text'] = ' '.join(item['classifiers'])
        item['retweet_score'] = item['score']
        item['created_at'] = item['created_at'].split('T')[0]
        res.append(item)
    return res


data = load_data()
docno_to_tweet_map = create_map(data)

#enriched_data0 = enrich_text0(data.values())
#enriched_data1 = enrich_text1(data.values())
enriched_data2 = enrich_text2(data.values())


if not pt.started():
    pt.init()

# index_ref0 = pt.IterDictIndexer(
#     "./test_index0", overwrite=True, meta={'docno': 10}).index(enriched_data0, fields=('docno', 'text'))


# index_ref1 = pt.IterDictIndexer(
#     "./test_index1", overwrite=True, meta={'docno': 10}).index(enriched_data1, fields=('docno', 'text'))

index_ref2 = pt.IterDictIndexer(
    "./test_index2", overwrite=False, meta={'docno': 10, 'retweet_score': 10, 'classifier_text': 200,'created_at':15}).index(enriched_data2, fields=('docno', 'text', 'retweet_score', 'classifier_text','created_at'))


# # index with no classifier
# cm_0 = pt.BatchRetrieve(index_ref0, wmodel='CoordinateMatch')
# bm25_0 = pt.BatchRetrieve(index_ref0, wmodel='BM25')
# tuned_bm25_0 = pt.BatchRetrieve(
#     index_ref0, wmodel=bm25_tuning_helper(1.2, 8, 0.25))

# # index with classifier appended to text
# cm_1 = pt.BatchRetrieve(index_ref1, wmodel='CoordinateMatch')
# bm25_1 = pt.BatchRetrieve(index_ref1, wmodel='BM25')
# tuned_bm25_1 = pt.BatchRetrieve(
#     index_ref1, wmodel=bm25_tuning_helper(1.2, 8, 0.25))

# index with classfier as separate metadata field
tuned_bm25_2 = pt.BatchRetrieve(
    index_ref2, wmodel=bm25_tuning_helper(1.2, 8, 0.25))


def retweet_score_rerank(row):
    return (row['features'][0]+3*row['features'][1])*Math.log10(float(row['retweet_score'])+1)/2


tuned_bm25_with_qe = pt.apply.query(
    lambda q: expand_query(q['query'])) >> tuned_bm25_2

tuned_bm25_with_qe_classifier_search_tfidf_retweet_rerank = (tuned_bm25_with_qe >>
                                                             pt.text.get_text(index_ref2, ["retweet_score", "classifier_text", "created_at"]) >>
                                                             (pt.transformer.IdentityTransformer() **
                                                              pt.text.scorer(
                                                                 body_attr='classifier_text', wmodel='TF_IDF')
                                                              ) >>
                                                             pt.apply.doc_score(retweet_score_rerank))

# tuned_bm25_with_qe_classifier_search_bm25_retweet_rerank = (tuned_bm25_with_qe >>
#                                                             pt.text.get_text(index_ref2, ["retweet_score", "classifier_text", "created_at"]) >>
#                                                             (pt.transformer.IdentityTransformer() **
#                                                              pt.text.scorer(
#                                                                 body_attr='classifier_text', wmodel='BM25')
#                                                              ) >>
#                                                             pt.apply.doc_score(retweet_score_rerank))

# names = [
#     'Coordinate Match (no classifier)',
#     'Untuned BM25 (no classifier)',
#     'Tuned BM25 (no classifier)',
#     'Coordinate Match (classifier appended to text)',
#     'Untuned BM25 (classifier appended to text)',
#     'Tuned BM25 (classifier appended to text)',
#     'Tuned BM25 with query expansion',
#     'Tuned BM25 with query expansion and TFIDF classifier text search',
#     'Tuned BM25 with query expansion and BM25 classifier text search'
# ]

# res = pt.Experiment([cm_0, bm25_0, tuned_bm25_0,
#                      cm_1, bm25_1, tuned_bm25_1,
#                      tuned_bm25_with_qe,
#                      tuned_bm25_with_qe_classifier_search_tfidf_retweet_rerank,
#                      tuned_bm25_with_qe_classifier_search_bm25_retweet_rerank],
#                     topics_df, 
#                     qrel_df, 
#                     baseline=0,
#                     eval_metrics=['map', 'ndcg', 'ndcg_cut_10', 'ndcg_cut_25', 'mrt'],
#                     names=names)
# res.to_csv('final_experiment.csv')

final_algo = tuned_bm25_with_qe_classifier_search_tfidf_retweet_rerank

def date_converter(datestr):
    print(datestr)
    dateparts = datestr.split('-')
    return datetime.datetime(int(dateparts[0]),int(dateparts[1]),int(dateparts[2]))


@app.route("/search/<term>/count/<count>/fromDate/<fromDate>/toDate/<toDate>")
def search(term, count, fromDate, toDate):
    try:
        #pyterrier start
        search_result = final_algo.search(term)
        #pyterrier work done :)
        search_result = search_result.loc[(search_result['created_at']>=fromDate) & (search_result['created_at']<= toDate)]
        result=[]
        for item in search_result.head(int(count))['docno']:
            result.append({'id': data[docno_to_tweet_map[item]]['id']})
        return result
    except Exception as e:
        print(traceback.format_exc())
        return []

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=True, threaded=True)
