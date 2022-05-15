var gatewayName = "open-mqtt-gateway";
var mqttBaseTopic = "";
var debugMode = false;


bleGateway = { //see https://docs.openmqttgateway.com/use/ble.html
    "onlysensors": true,
    "interval": 55000, //ms
    "minrssi": -200,
    "scanbcnct": 30,
    "hasspresence": false,
    "bleconnect": false,
    "white-list": [],
    "black-list": []
}

writeSettings();

trackMqtt(mqttBaseTopic + gatewayName + "/LWT", function (message) {
    deviceName = gatewayName;
    controlName = "status";

    virtualDevice = createDeviceIsNotExists(deviceName);
    createControlIsNotExists(virtualDevice, controlName, "text", "offline", true);
    dev[deviceName + "/" + controlName] = message.value;

});

trackMqtt(mqttBaseTopic + gatewayName + "/+/#", function (message) {
    debugLog("name: {}, value: {}".format(message.topic, message.value));

    gatewayType = getGatewayType(message.topic);

    switch (gatewayType) {
        case "SYStoMQTT":
            universalParse("", "", message);
            break;
        case "BTtoMQTT":
            universalParse("BT", "id", message);
            break;
        case "ADCtoMQTT":
            universalParse("{}_ADC".format(gatewayName), "", message);
            break;
        case "DHTtoMQTT":
            universalParse("{}_DHT".format(gatewayName), "", message);
            break;
        case "HCSR501toMQTT":
            universalParse("{}_HCSR501".format(gatewayName), "", message);
            break;
        case "CLIMAtoMQTT":
            sensorType = getSensorType(message.topic);
            if (sensorType === "ds1820") {
                ds1820(message);
            } else {
                universalParse("{}_{}".format(gatewayName, sensorType), "", message);
            }
            break;
        default:
            break;
    }
});

function writeSettings() {
    publishValue("", mqttBaseTopic + gatewayName + "/commands/MQTTtoBT/config", JSON.stringify(bleGateway))
}

function debugLog(str) {
    if (debugMode) {
        log.info(str)
    }
}

function ds1820(message) {
    var device = JSON.parse(message.value);
    virtualDevice = undefined;
    deviceName = "{}_ds18b20".format(gatewayName);
    virtualDevice = createDeviceIsNotExists(deviceName);

    for (var key in device) {

        newValue = formatValue(device["tempc"]);
        controlType = getControlType(newValue);
        controlDefaultValue = getDefaultValue(controlType);
        controlName = device["addr"];

        createControlIsNotExists(virtualDevice, controlName, controlType, controlDefaultValue, true);
        dev[deviceName + "/" + controlName] = newValue;
    }
}

function universalParse(prefix, idKey, message) {
    var device = JSON.parse(message.value);
    virtualDevice = undefined;

    deviceName = gatewayName;

    if (idKey && prefix) {
        deviceName = "{}_{}".format(prefix, device[idKey]);
    } else {
        if (prefix) {
            deviceName = "{}".format(prefix);
        }
    }

    virtualDevice = createDeviceIsNotExists(deviceName);

    for (var key in device) {

        newValue = formatValue(device[key]);
        controlType = getControlType(newValue);
        controlDefaultValue = getDefaultValue(controlType);
        controlName = key;

        createControlIsNotExists(virtualDevice, controlName, controlType, controlDefaultValue, true);
        dev[deviceName + "/" + controlName] = newValue;
    }
}

function getGatewayType(topic) {
    return mqttBaseTopic ? topic.split('/')[2] : topic.split('/')[1];
}

function getSensorType(topic) {
    return mqttBaseTopic ? topic.split('/')[3] : topic.split('/')[2];
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