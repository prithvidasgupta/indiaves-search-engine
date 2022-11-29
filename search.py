import pyterrier as pt
import json
import pandas as pd
import math
# from sklearn.model_selection import train_test_split
# import fastrank
from flask import Flask

app = Flask(__name__)

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

def enrich_text(arr):
    res = list()
    for item in arr:
        item['text'] = item ['text'] +' ' + ' '.join(item ['classifiers'])
        item['retweet_score']=item['score']
        res.append(item)
    return res

data = load_data()
docno_to_tweet_map = create_map(data)
enriched_data = enrich_text(data.values())

qrel_df = pd.read_csv('terrier_relevance.csv')
qrel_df = qrel_df[['docno', 'label', 'query', 'qid']]
topics_df = qrel_df[['qid', 'query']].drop_duplicates().astype(
    {'qid': 'str'}).reset_index()
qrel_df = qrel_df[['qid', 'docno', 'label']].astype(
    {'qid': 'str', 'docno': 'str'})

if not pt.started():
    pt.init()

index_ref = pt.IterDictIndexer(
    "./test_index", overwrite=True, meta={'docno':1479,'retweet_score': 2000}).index(enriched_data, fields = ('docno', 'text', 'score', 'created_at'))

index = pt.IndexFactory.of(index_ref)

bm25 = pt.BatchRetrieve(index, wmodel='BM25')

cm = pt.BatchRetrieve(index, wmodel='CoordinateMatch')

tfidf = pt.BatchRetrieve(index, wmodel='TF_IDF')

tuned_bm25 = pt.BatchRetrieve(index, wmodel=bm25_tuning_helper(1.2,8,0.25))

# test= tuned_bm25>>pt.text.get_text(index, ['retweet_score']) >> (
#     pt.transformer.IdentityTransformer()
#     **
#     (pt.apply.doc_score(lambda row: float(row['retweet_score'])))
# )

#test = (pt.text.get_text(index, ['retweet_score']) >> (pt.apply.doc_score(lambda row: float(row['retweet_score']))))

# train_topics, test_topics = train_test_split(topics_df, test_size=10, random_state=13)

# train_request = fastrank.TrainRequest.coordinate_ascent()

# params = train_request.params
# params.init_random = True
# params.normalize = True
# params.seed = 1234567

# ca_pipe = test >> pt.ltr.apply_learned_model(train_request, form='fastrank')

# ca_pipe.fit(train_topics, qrel_df)


# res = pt.Experiment([cm, bm25, tfidf, tuned_bm25],
#                      topics_df,
#                      qrel_df,
#                      eval_metrics=["map", "ndcg"],
#                      names=['naive','bm25','tfidf', 'tuned_bm25'],
#                     baseline=0)

# res.to_csv('experiment_3.csv')

# print(res)

@app.route("/search/<term>/count/<count>")
def search(term, count):
    print(term)
    search_result = (tuned_bm25 % int(count)).search(term)
    result=[]
    for item in search_result['docno']:
        result.append(data[docno_to_tweet_map[item]]['id'])
    return result

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=True, threaded=True)