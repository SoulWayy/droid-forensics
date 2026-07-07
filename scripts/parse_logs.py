import json, sys; [print(json.dumps(x)) for x in json.load(sys.stdin) if x.get("tags", {}).get("isStreamJsonRpcWorker") == "true"]
