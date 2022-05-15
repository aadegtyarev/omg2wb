var OmgDeviceTopic = "open-mqtt-gateway";
var deviceWhiteList = [];
var BtOnlySensors = true;
var debugMode = false;

writeSettings();

trackMqtt(OmgDeviceTopic + "/LWT", function (message) {
  deviceName = OmgDeviceTopic;
  controlName = "status";
  
  virtualDevice = createDeviceIsNotExists(deviceName);
  createControlIsNotExists(virtualDevice, controlName, "text", "offline", true);
  dev[deviceName + "/" + controlName] = message.value;
   
});

trackMqtt(OmgDeviceTopic + "/+/#", function (message) {
    debugLog("name: {}, value: {}".format(message.topic, message.value));
    
    protocol = getProtocol(message.topic);

    switch (protocol) {
        case "SYStoMQTT":
                universalParse("OMG", "", message);
            break;
        case "BTtoMQTT":
                universalParse("BTtoMQTT", "id", message);
            break;    
        default:
            break;
    }
});

function writeSettings() {
    publishValue("", OmgDeviceTopic + "/commands/MQTTtoBT/config", JSON.stringify({ "onlysensors": BtOnlySensors }))
}

function debugLog(str) {
    if (debugMode) {
        log.info(str)
    }
}

function universalParse(prefix, idKey, message) {
    var device = JSON.parse(message.value);
    virtualDevice = undefined;
	
  	if (prefix === "OMG") {
		deviceName = OmgDeviceTopic;      
    } else{
		deviceName = "{}_{}".format(prefix, device[idKey]);            
    }
  
    virtualDevice = createDeviceIsNotExists(deviceName);

    if (isAllowDevice(device[idKey])) {
        for (var key in device) {

            newValue = formatValue(device[key]);
            controlType = getControlType(newValue);
            controlDefaultValue = getDefaultValue(controlType);
            controlName = key;

            createControlIsNotExists(virtualDevice, controlName, controlType, controlDefaultValue, true);
            dev[deviceName + "/" + controlName] = newValue;
        }
    }
}

function getProtocol(topic){
    return topic.split('/')[1];
}

function isAllowDevice(deviceName) {
    result = (deviceWhiteList.length === 0);
    if (typeof deviceName !== "undefined") {
        deviceWhiteList.forEach(function (item) {
            result = deviceName.indexOf(item) > -1;
        });
    }
    return result;
}

function getControlType(value) {
    return isNumber(value) ? "value" : "text";
}

function isNumber(value) {
    return Number(value) === +value && value !== null;
}

function formatValue(value) {
    return isNumber(value) ? Number(value) : String(value);
}

function getDefaultValue(controlType) {
    switch (controlType) {
        case "text":
            return "";

        case "value":
            return 0;

        default:
            return false;
    }
}

function isExistsDevice(deviceName) {
    return (getDevice(deviceName) !== undefined);
}

function createDeviceIsNotExists(deviceName) {

    if (isExistsDevice(deviceName)) {
        virtualDevice = getDevice(deviceName);
    } else {
        virtualDevice = defineVirtualDevice(deviceName, {
            title: deviceName,
            cells: {}
        })
    }

    return virtualDevice;
}

function createControlIsNotExists(virtualDevice, controlName, controlType, controlDefaultValue, controlReadOnly) {

    if (!virtualDevice.isControlExists(controlName)) {
        virtualDevice.addControl(controlName,
            {
                type: controlType,
                value: controlDefaultValue,
                readonly: controlReadOnly,
                order: 0
            }
        );
    }
}

function publishValue(postfixTopic, topicName, newValue) {
    cmdTopicName = postfixTopic ? "{}/{}".format(topicName, postfixTopic) : topicName;
    publish(cmdTopicName, newValue, 2, true);
}