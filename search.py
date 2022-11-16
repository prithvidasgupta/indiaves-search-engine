import pyterrier as pt
import pandas as pd
import json

data = None

with open('./tagged.json') as file:
    data = json.load(file)

if not pt.started():
    pt.init()

index_ref = pt.IterDictIndexer("./test_index", overwrite=True).index(data)

index = pt.IndexFactory.of(index_ref)

search = pt.BatchRetrieve(index, wmodel='BM25')

res=search.search('perching birds')

print(res)


