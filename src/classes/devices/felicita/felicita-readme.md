#Felicita Scale

##Sample BLE Discovery

```
{
	"id": "91768FE8-C303-CAA5-782B-A89794C90A93",
	"state": "disconnected",
	"rssi": -52,
	"name": "FELICITA",
	"advertising": {
		"kCBAdvDataLocalName": "FELICITA",
		"kCBAdvDataManufacturerData": {},
		"kCBAdvDataServiceUUIDs": ["FFE0", "FEE0"],
		"kCBAdvDataIsConnectable": 1
	}
}
```

##Sample BLE status updates

```
[1,2,43,48,48,48,48,48,48,32,103,83,79,48,34,137,13,10]
```

index[0-3] = unknown
index[3-9] = weight digits, substract 48 from each to get weight, index 8-9 are the decimal places. Example 1010.10 would be [1,2,43,49,48,49,48,49,48,32,103,83,79,48,34,137,13,10].
index[9-11] = scale units, convert from binary to text using TextDecoder.
index[11-15] = unknown
index[15] = battery, value between 129 and 158.
index[16-19] = unknown
