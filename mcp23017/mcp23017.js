/**
 * Copyright 2015 Gary Thom.
 * 
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

module.exports = function(RED) {
	var MCP = require("node-mcp23017");
	String.prototype.endsWith = function(suffix) {
		return this.match(suffix + "$") == suffix;
	};

	function mcp23017_Node(config) {
		RED.nodes.createNode(this, config);

		this.topic = config.topic;
		if (this.topic.endsWith("/") == false)
			this.topic += '/';

		var node = this;

		var icAddress = parseInt(config.address);

		var mcp = new MCP({
			address : icAddress, // all address pins pulled low
			device : config.device, // Model B
			debug : false
		});

		// set all GPIOS to be OUTPUTS
		for (var i = 0; i < 16; i++) {
			mcp.pinMode(i, mcp.OUTPUT);
			mcp.digitalWrite(i, mcp.HIGH);
		}

		this
				.on(
						'input',
						function(msg) {
							this.status({
								fill : "red",
								shape : "dot",
								text : "Busy`"
							});
							if (msg.topic.toUpperCase().indexOf('ALL') > -1) {
								mcp23017_set_all_outputs(msg.payload);
								send_status_message("ALL", node.topic + pin,
										msg.payload);
							} else if (msg.topic.toUpperCase()
									.indexOf('STATUS') > -1) {
								mcp23017_send_status();
							} else {
								var pin = get_pin_from_topic(msg.topic);
								if (pin >= 0 && pin < 16) {
									mcp23017_process(pin, msg.payload);
									send_status_message(pin, node.topic + pin,
											msg.payload);
								} else {
									node
											.warn("Topic should contain a valid pin in the rannge 0..15: ["
													+ msg.topic + "]");
								}
							}
							this.status({
								fill : "green",
								shape : "dot",
								text : "Ready"
							});
						});

		function send_status_message(pin, topic, state) {
			var statusMsg = {}
			statusMsg.topic = topic + pin;
			statusMsg.payload = "Sent " + state + " to relay " + pin;
			node.send(statusMsg);
		}

		function mcp23017_send_status() {
			for (var pin = 0; pin < 16; pin++) {
				mcp.digitalRead(pin, function(err, value) {
					node.log("Pin " + pin + " - " + value);
					var statusMsg = {};
					statusMsg.topic = node.topic + pin;
					statusMsg.payload = {
						pin : pin,
						value : (value) ? "OFF" : "ON"
					};
					node.send(statusMsg);
				});
			}
		}

		function mcp23017_set_all_outputs(state) {
			for (var pin = 0; pin < 16; pin++) {
				mcp23017_process(pin, state);
			}
		}

		function mcp23017_process(pin, state) {
			mcp.digitalWrite(pin, (state == "ON") ? mcp.LOW : mcp.HIGH);
		}

		function get_pin_from_topic(topic) {
			var parts = topic.split('/');
			var index = parts.length - 1;
			return parseInt(parts[index]);
		}
	}

	RED.nodes.registerType("mcp23017", mcp23017_Node);
}
