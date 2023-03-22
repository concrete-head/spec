import json
import os

print("Finding .json files in current directory " + os.getcwd() + "\n")

##find json files in directory
files = os.listdir(".")
json_files = []
for f in files:
	if f[-5:] == ".json":
		json_files.append(f)
		print("Found " + f)

print("\n")

##add type to each entry in all json files
for f in json_files:
	##read file and parse json	
	with open(f, "r") as file:
		data = file.read()
		json_data = json.loads(data)

	##add new entry "type"
	for entry in json_data:
		name = f[:-5]
		entry["type"] = name

	##save 
	json_string = json.dumps(json_data, indent=4, sort_keys=True, ensure_ascii=False) 
	with open(f, "w") as file:
		file.write(json_string)
	
	print("Saving " + f)	

