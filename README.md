ServiceNow incident demo
=========

For this demo, we use ServiceNow business rules to send events to AAP 2.5 (EDA) each time an incident is opened. ServiceNow is the event source which will send a payload to EDA. EDA will be using an Event stream (only available on AAP 2.5>) to listen to listen for the payload. 

General info on Event Streams (simplified event routing)
------------
In AAP 2.5 we have Event Streams. Event streams simplify routing by connecting your sources directly to your rulebooks. They let webhook-based sources trigger one or many rulebook activations without needing separate endpoint configurations. This approach supports horizontal scaling, so any webhook-capable source—like SCMs, ITSMs, or observability tools—can automatically trigger actions when conditions are met.
![alt text](images/event_stream.png "Event Streams")


Demo Setup Instructions
=========

Assumptions
------------
- AAP 2.5 is deployed and default decision environment available
- Service Now Developer instance has been created

Actions on AAP
------------
We have to create two credentials for this demo. One is a token for the event stream to accept incoming messages, the other is the AAP credential to run a job template.
Log into AAP. Navigate to Automation Decisions > Infrastructure > Credentials. Click Create credential. Give the token a name (SNOW_token), choose an organisation, select 'Token Event Stream'. In the Type Details section, generate a random token and paste it into the Token field. Leave HTTP Header Key as 'Authorization' (default). Then click 'Create credential'.

![alt text](images/create_token_es_credential.png "Event Streams")

<br>
Now for the second credential, the instructions are the same but adjust the details to suit the screenshot. Remember to append '/api/controller/' to your AAP URL. Finally click 'Create credential'

![alt text](images/create_aap_es_credential.png "Event Streams")

<br>
Now that we have both tokens created, we can create the Automation Decisions project. Go to Automation Decisions > Projects, click 'Create project'.


ServiceNow Business rule
------------

Setup a business rule in ServiceNow. Navigate to **Activity subscriptions** -> **Administration** -> **Business rules** or just search for **Business rules**. Click "New" to create a new business rule. Fill in the first form:

* Enter a name for the business rule
* Table should be set to **Incident**
* Tick the **Advanced** checkbox

In the **When to Run** section:

* Set action on insert.
* when to run should be "after".
* Add a condition. For example assignment group is equal to "Event Driven Ansible".


![](images/eda_snow_business_rule.png)

On the **advanced** tab, paste this sample script. This will send a json payload to EDA which contains the CI name, incident number and incident short description.

**NOTE** make sure you substitute your EDA instance and port number in the example below - this line **r.setEndpoint("http://eda.example.com:5000/endpoint");**

```bash
(function executeRule(current, previous /*null when async*/ ) {
 try {
 var r = new sn_ws.RESTMessageV2();
 // Enter EDA URL and port number here. In this one we have eda.example.com port 5000.
 r.setEndpoint("http://eda.example.com:5000/endpoint");
 r.setHttpMethod("post");

 // some stuff to get ci name instead of id

 var ci = new GlideRecord('cmdb_ci');
 ci.get('sys_id', current.getValue("cmdb_ci"));
 var ci_name = ci.getValue('name');

 var number = current.getValue("number");	
 var short_description = current.getValue("short_description");
 var cmdb_ci = current.getValue("cmdb_ci");	

 var obj = {
 "number": number,
 "short_description": short_description,
 "ci_name": ci_name,

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
```

This was adapted from https://www.transposit.com/devops-blog/itsm/creating-webhooks-in-servicenow/


Quick and easy test
------------

SSH to your EDA controller and install netcat:

```bash
sudo dnf install nc -y
```

Start listening on port 5000

```bash
nc -l 5000
```

Create a ServiceNow Incident using the playbook in this repo or manually. Make sure you actually set a valid CI or it might not work.


You'll see this payload come through to your EDA controller. If this works you can create a rulebook. Examples in this repo.

```bash
$ nc -l 5000
^[[BPOST /endpoint HTTP/1.1
Content-Length: 73
X-SNC-INTEGRATION-SOURCE: b3331a101b02b5941024eb9b2d4bcbfb
User-Agent: ServiceNow/1.0
Host: eda.example.com:5000

{"number":"INC0010004","short_description":"testing","ci_name":"lnux100"}
```


Pat's own notes because he forgets - AAP setup
------------

Edit vault file with ServiceNow and controller details:

```bash
ansible-vault edit group_vars/all/vault.yml 
```

Run the playbook to configure controller:

```bash
ansible-navigator run configure_controller.yml --ask-vault-pass
```

Extra manual steps I haven't automated yet:

* Create a token for eda application and paste into EDA controller
* Create rulebook and project in EDA controller
* Ensure ServiceNow host has relevant CI in the Linux DB
* Add the same CI to the Demo inventory in controller
* Paste the aap users private key into the credential in controller