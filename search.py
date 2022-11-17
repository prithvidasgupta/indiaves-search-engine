import pyterrier as pt
import json
import pandas as pd
import math


def load_data():
    with open('./tweets.json') as file:
        data = json.load(file)
        return data


def create_map(data):
    map = {}
    for (key, value) in data.items():
        map[str(value['docno'])] = key
    return map

def bm25_tuning_helper(k1=1.2,k3=8,b=0.25):
    def bm25_weighting_tuned(keyFreq, posting, entryStats, collStats):
        normal_qtf = (k3+1)*keyFreq/(k3 + keyFreq)
        normal_tf = (k1+1)*posting.getFrequency()/((k1*(1-b+(b*posting.getDocumentLength()/collStats.averageDocumentLength)))+posting.getFrequency())
        normal_idf = math.log((collStats.numberOfDocuments-entryStats.getDocumentFrequency()+0.5)/(entryStats.getDocumentFrequency()+0.5))
        return normal_idf*normal_tf*normal_qtf
    return bm25_weighting_tuned


data = load_data()
docno_to_tweet_map = create_map(data)

qrel_df = pd.read_csv('terrier_relevance.csv')
qrel_df = qrel_df[['docno', 'label', 'query', 'qid']]
topics_df = qrel_df[['qid', 'query']].drop_duplicates().astype(
    {'qid': 'str'}).reset_index()
qrel_df = qrel_df[['qid', 'docno', 'label']].astype(
    {'qid': 'str', 'docno': 'str'})

if not pt.started():
    pt.init()

index_ref = pt.IterDictIndexer(
    "./test_index", overwrite=True).index(data.values())

index = pt.IndexFactory.of(index_ref)

bm25 = pt.BatchRetrieve(index, wmodel='BM25')

cm = pt.BatchRetrieve(index, wmodel='CoordinateMatch')

tfidf = pt.BatchRetrieve(index, wmodel='TF_IDF')

tuned_bm25 = pt.BatchRetrieve(index, wmodel=bm25_tuning_helper(1.2,8,0.25))

res = pt.Experiment([cm, bm25, tfidf, tuned_bm25],
                    topics_df,
                    qrel_df,
                    eval_metrics=["map", "ndcg"],
                    names=['naive','bm25','tfidf', 'tuned_bm25'],
                    baseline=0)

res.to_csv('experiment_1.csv')

print(res)



