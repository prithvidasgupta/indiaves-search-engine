import pyterrier as pt
import json
import pandas as pd


def load_data():
    with open('./tweets.json') as file:
        data = json.load(file)
        return data


def create_map(data):
    map = {}
    for (key, value) in data.items():
        map[str(value['docno'])] = key
    return map


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

bm25 = bm25.parallel(2)

cm = pt.BatchRetrieve(index, wmodel='CoordinateMatch')

cm = cm.parallel(2)

tfidf = pt.BatchRetrieve(index, wmodel='TF_IDF')

tfidf = tfidf.parallel(2)

res = pt.Experiment([cm, bm25, tfidf],
                    topics_df,
                    qrel_df,
                    eval_metrics=["map", "ndcg"],
                    names=['naive','bm25','tfidf'],
                    baseline=0)

res.to_csv('experiment_1.csv')
