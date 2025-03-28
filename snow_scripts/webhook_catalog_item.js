(function executeRule(current, previous /*null when async*/) {
    try {
        var r = new sn_ws.RESTMessageV2();
        r.setEndpoint("<Replace me with your event stream URL>");
        r.setHttpMethod("post");

        var token = "<Replace me with your token>";
        r.setRequestHeader("Authorization", "Bearer " + token);

        var reqItemSysId = current.getValue("request_item");
        var ritm_number = "";
        var req_sys_id = "";

        if (reqItemSysId) {
            var reqItem = new GlideRecord('sc_req_item');
            if (reqItem.get(reqItemSysId)) {
                ritm_number = reqItem.getValue("number"); // RITM number
                req_sys_id = reqItem.getValue("request"); // sys_id of REQ
            }
        }

        var obj = {
            "ritm_number": ritm_number,
            "req_sys_id": req_sys_id
        };

        var body = JSON.stringify(obj);
        gs.info("Webhook body: " + body);

        r.setRequestBody(body);
        var response = r.execute();
        var httpStatus = response.getStatusCode();
    } catch (ex) {
        var message = ex.message;
        gs.error("Error message: " + message);
    }

    gs.info("Webhook target HTTP status response: " + httpStatus);
})(current, previous);

