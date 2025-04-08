Demo Brief: Event-Driven VM Provisioning with ServiceNow and Ansible Automation Platform 2.5
=========
This demo showcases how ServiceNow and Red Hat Ansible Automation Platform (AAP) 2.5, using Event-Driven Ansible (EDA), can be integrated to automate virtual machine (VM) provisioning through a Service Catalog request.

Use Case Overview
A user initiates a VM request via the ServiceNow Service Catalog. This request follows an approval and fulfillment process automated through ServiceNow and EDA:

1. The user submits a VM request from the Service Catalog.

1. A ServiceNow Flow Designer workflow simulates a manager approval step.

1. Once approved, the same flow continues to create a catalog task.

1. A ServiceNow business rule, triggered by the creation of this task, sends a payload containing the VM request number to Event Driven Ansible.

1. Ansible Automation Platform 2.5, using EDA Event Streams, receives this event and enriches the request information by communicating with Service (Getting specific VM details). 

1. EDA rulebook then performs action depending on the business purpose selected on the request.

1. When business purpose == Testing, a rule is triggered to create an AWS EC2 instance.


This demo illustrates how event-driven automation can streamline IT operations by connecting user service requests in ServiceNow with automated VM provisioning workflows in Ansible Automation Platform.

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
- Working AWS environment with access key and secret key.

Initial Actions on AAP
------------
To start with, we'll create two credentials for this demo. One is a token for the event stream to accept incoming messages, the other is the AAP credential to run a job template.
Log into AAP. Navigate to Automation Decisions > Infrastructure > Credentials. Click Create credential. Give the token a name (SNOW_token), choose an organisation, select 'Token Event Stream'. In the Type Details section, generate a random token and paste it into the Token field (Keep a note of this token somewhere). Leave HTTP Header Key as 'Authorization' (default). Then click 'Create credential'.

![alt text](images/create_token_es_credential.png "Event Streams")

<br>
Now for the second credential, the instructions are the same but adjust the details to suit the screenshot. Remember to append '/api/controller/' to your AAP URL. Finally click 'Create credential'

![alt text](images/create_aap_es_credential.png "Event Streams")

<br>
Now that we have both tokens created, we can create the Automation Decisions project. Go to Automation Decisions > Projects, click 'Create project'. Enter a name for the project and the Source control URL (This github project). Then click 'Create project'.

![alt text](images/ad_project.png "Event Streams")

<br>

Next we need the Event Stream. Go to Automation Decisions > Event Streams. Click 'Create event stream'. Name the event stream, select 'Token Event Stream' as Event Stream Type, then select 'SNOW Token' as the credential (which we previously created). 'Forward events to rulebooks activation' should be enabled. Then click 'Create event stream'. Copy the URL that is displayed in the newly created event stream. We will need it in the next tasks.
![alt text](images/snow_catalog_event_stream.png "Event Streams")

<br>

Lets test this
------------

Log onto your developer instance of Service Now. Navigate to 'All' > 'System Definition' > 'Scripts - Background'. This will allow you to run a freeform script to ensure the EDA has been setup correctly. Copy and paste the webhook_test_script.js script found in the snow_scripts directory of this repo. Replace 'example-url' with the URL that you copied in the above task. Replace the 'example-token' with the token found in credential you previously created. I have done so, in the example below. Click run and you should see a HTTP responce of 200 returned. 
![alt text](images/test_script_snow.png "Event Streams")

As well as 1 event recieved in your newly created event stream in AAP.
<br>

![alt text](images/event_recieved_test.png "Event Streams")
<br>


**Note: If you get any SSLPeerUnverifiedException errors at this point, look at the Troubleshooting section at the end of the tutorial**

ServiceNow Flow configurations
------------
We now need to take a look at the flow of events, starting from servicenow and how we configure that.
<br>
First off we will create a new fulfillment group. Inside of ServiceNow go to all > Service catalog > Catalog administration > Fulfillment groups. From here create a new Fulfillment group called Event Driven Ansible. In future steps, we will create a buiness rule to ensure anything in this fulfillment group is processed by EDA.

![alt text](images/new_fulfillment_group.png "Event Streams")
<br>
<br>
Now lets create a Flow that will utilise this group.
<br>
<br>
Go to All > Process automation > Flow designer. Once inside the flow dewigner, find the "Service Catalog item request" Flow and click into it.
<br>
Then look for the three dots on the top right hand side and click "copy flow". This will ask you to name your new workflow. I've named it the following.
Click copy, now we have your new workflow.

![alt text](images/copy_flow.png "Event Streams")
<br>

<br>
Taking a closer look at this workflow, we can see we have a few events happening.
<br>
Go ahead and delete all of the actions, leaving only the trigger as shown below:
<br>

![alt text](images/no_actions_flow.png "Event Streams")
<br>
<br>
Add a new action under ServiceNow Core > Ask for Approval.

![alt text](images/add_approval_flow1.png "Event Streams")
<br>

Drag the 'Requested Item Record' on the right to the Record box. Table, Approval Field and Journal Field should auto populate.
![alt text](images/new_approve_pill.png "Event Streams")
<br>

Under rules, we'll keep this simple and ask the System Administrator to approve. Select Approve **When** Anyone Approves. Then click the Add User button circled below to add the System Administrator. 

![alt text](images/sys_admin_approve.png "Event Streams")
<br>

Create a new action ServiceNow Core > Create Catalog Task. 

![alt text](images/create_catalog_task.png "Event Streams")
<br>
Drag the 'Requested Item Record' from the left menu, into the Requested item box, (as shown in previous example). Give a short description of the task, then add an 'Assignment Group' field and set it to 'Event Driven Ansible' (The fulfillment group you created earlier).

![alt text](images/cat_task_details.png "Event Streams")

<br>

Optionally, you can add stages add point, as shown below. Once finished, click save and then activate to make the Flow available.

![alt text](images/add_stage.png "Event Streams")
<br>
<br>
**Note: This flow is for demo purposes only, I have missed obvious things such as manager rejection to end the flow and more. You can include these things if you want, but i'm keeping things simple.**


ServiceNow Catalog Item
------------
In the SNOW developer instance, we have an existing catalog item called "VM Provisioning". Lets find that item and amend it, to use our new workflow.
<br>
<br>
Go to, All > Service Catalog > Catalog Definitions > Maintain Items. Then search for "VM Provisioning". Click into the "VM Provisioning" item. You will see a tab called "Process Engine". Click on that, then adjust the flow to our newly created "EDA Service Catalog item request" flow, as shown below. Then click update.

![alt text](images/change_flow.png "Event Streams")


ServiceNow Business rule
------------
We now need to setup a new business rule, that states that any new item created, with Assignment Group = Event Driven Ansible, should be processed by Event Driven Ansible. To do this, we need to create a business rule.
<br>
<br>

Setup a business rule in ServiceNow. Navigate to **Activity subscriptions** -> **Administration** -> **Business rules** or just search for **Business rules**. Click "New" to create a new business rule. Fill in the first form:

* Enter a name for the business rule
* Table should be set to **sc_task**
* Tick the **Advanced** checkbox

In the **When to Run** section:

* Set action on insert.
* when to run should be "after".
* Add a condition. For example assignment group is equal to "Event Driven Ansible".
![alt text](images/new_rule.png "Event Streams")

<br>
<br>

On the **advanced** tab, copy the script from webhook_catalog_item.js found under the snow_scripts directory in this repo. Paste the script in the box provided and click save.
<br>
This will send a json payload to EDA which contains the CI name, incident number and incident short description.

**NOTE** make sure you substitute your EDA Event Stream URL and token shown in the screenshot below.
![alt text](images/code_snippet.png "Event Streams")
<br>
<br>
The rest of the script is used  for grabbing the important infomration from the request and composing the json package ready to send to EDA. Adjust this if you like.
<br>

Now back to AAP to finish off this setup
------------
So at this point we have a Service Now catlog item configured to send a payload to EDA. But at this point EDA has no idea what to do with that payload. So now we'll create a Rulebook Activation to process that payload, and in turn process the request.
<br>
<br>
In AAP, go to Automation Decisions > Rulebook Activations. Click 'Create rulebook activation'. Give it a suitable name and Organisation. From the project drop down, select 'EDA Demo' - the project we created previously. Under the Rulebook drop down, select snow_rulebook_debug.yml. You can see details of that rulebook in this repo under rulebooks (as this is the repo that project is reading from). We are choosing this rulebook as an initial rulebook because it is very simple and will simply output the payload so that we know the conneectivity between SNOW and EDA is working, before we go to more advanced things.
<br>
<br>
Under Event streams, click on the litle cog, it will take you to the below screen. Select the event stream that you created earlier, then click save.

![alt text](images/rule_event_stream.png "Event Streams")
<br>
<br>
Then complete the rest of the rule activation form, selecting the AAP credential so that EDA can run job templates in controller. Also selecting your default decision environment so that we can run the rulebook. Your Rule activation should now look like the following. Click 'Create rulebook activation' and the rulebook will start up.

![alt text](images/rule_complete1.png "Event Streams")
<br>
<br>
Under Automation Decisions > Rulebook Activations you can see a high level view of your Rulebooks. This is an easy way to keep an eye on your Rulebooks and which ones are firing.

![alt text](images/rule_fire_count.png "Event Streams")

Joining the dots - let's give it a go
------------
At this point we configured everything on the Service Now side and everything on the EDA side, from a configuration perspecive at least - we will look at rulebooks more closely once we know it's all fully connected and working.
<br>
<br>
Go to All > Catalogs. Then click into Technical Catalog. From that window, you will see 'VM Provisioning' under Services. Click on that.
<br>
<br>
Complete the form with example vm details, then click order.

![alt text](images/order_vm.png "Event Streams")
<br>
Now we need to approve that request. Go to All > Self Service > My Approvals. You will see a new approval requested.

![alt text](images/new_approval.png "Event Streams")
<br>
<br>
Click into the approval request. You will see the following screen. **Do not click approve just yet.**

![alt text](images/pre_approval.png "Event Streams")
<br>
<br>
Go back onto AAP, go to Automation Decisions > Rulebook Activations. Then click on your newly created rulebook activation. Then click on the history tab. You should see the rulebook running here, click into it, this will bring up the rulebook logs.

![alt text](images/rulebook_logs1.png "Event Streams")
<br>
<br>
Now go back to the approval screen in Service Now and click approve. After a little while, you should see the payload recieved in the logs. You will see the ritm_number and req_sys_id.

![alt text](images/payload_recieved1.png "Event Streams")
<br>
<br>
Now we know that we are up and working. It's time to do some actual automation.
<br>


Now for some actual automation.
------------
We're going keep this very simple. We will create the requested VM as an EC2 instance on AWS. Below is a diagram of the logical flow of the VM request:
![alt text](images/vm_provisioning_flow.drawio.png "Event Streams")
So we have a request come in from Service Now for a new VM. The event payload lands inside of the EDA rulebook for processing.
<br>
<br>
Breaking down this rulebook (found under rulebooks/snow_catalog_request.yml) we see three rules. The first rule is a service now enrichment rule. This rule will be acivated on any event landing on this rulebook. This is because:
```yaml
condition: event.payload is defined
```
So as long as the payload is defined it will run the 'Enrich ServiceNow REQ' job template. It then uses:
```yaml
post_events: true
```
Which effectively takes the output of the job template which was run and passes that information back into the Rulebook. The 'Enrich ServiceNow REQ' job template uses the gather_ritm_details.yml playbook. We will not go into great detail on the inner workings of this playbook, but please read through it to get an understanding. The main part to note is below:

```yml
- name: Consolidate all facts and original event into set_stats
  ansible.builtin.set_stats:
    data:
      enriched_event: "{{ enriched_event }}"
      original_event: "{{ req_number | default({}) }}"
      user: "{{ userinfo.record[0].email }}"
      business_purpose: "{{ business_purpose_value }}"
```
We use the set_stats module to pass the information back to the rulebook. The 'post_events:true', any set_stats data that is set here can be accessed in the reactivation of the rulebook. So now we can access event.enriched_event or event.business_purpose etc. **Remember, at this point we are not setting a payload. So event.payload will be no longer accessible on the reactivation of the rulebook.** This caught me off guard, the first time I did this, I had **event.payload** set on one of the activated rules, and it kept failing with **missing variable**.
<br>
<br>
Once the new enriched data is passed back into the rulebook. It will ignore the first rule, as event.payload will no longer be defined (as described above). So from there it has two rules left. 

```yml
event.business_purpose == "special_projects"
```
OR
```yml
event.business_purpose == "testing"
```
<br>
Meaning, a different actions will be taken depending on the business purpose. For demo purposes we will only be showing the activation of "event.business_purpose == 'testing'". This means that when a user selects a test VM in service now, it will activate this rule and create the AWS EC2 instance. 
<br>
<br>
However, feel free to extend this demo. The other rule in that rulebook: "event.business_purpose == 'special_projects'" could be used to create a VM on vmware for example. In this particualar demo, to keep everything in scope, if the **special_projects** rule gets activated it will only print something activate a job_template that will print the VM details.
<br>
<br>

Okay, lets get started and set this up
------------
First we need an Amazon Web Services credential created. I will not go into detail of how to do this, as it's out of scope for this Demo. Refer here for more information: https://docs.ansible.com/automation-controller/4.4/html/userguide/credentials.html#amazon-web-services 
<br>
<br>
Now we need three job templates creating.
<br>
| Job Template Name             | Playbook Name                 |
|-------------------------------|-------------------------------|
| Enrich ServiceNow REQ         | gather_ritm_details.yml       |
| Provision Test VM             | create_test_vm.yml            |
| Provision Special Projects VM | create_special_project_vm.yml |

<br>
You will find all of these playbooks under the playbooks directory. Create the job templates for each of them. Remember to tick the Prompt on launch setting above Extra variables on all job templates. This ensures the variables will be passed into the job template at runtime. Also, make sure to attach the newly created AWS credential to the "Provision Test VM" job template.

<br>
<br>
A quick breakdown of the "create_test_vm.yml" playbook shows it starts with variabilising an instance_type_map, which looks at the CPU and RAM variables. It then uses that information to create an instance type map.

 ```yml
instance_type_map:
    "2_4": t2.medium      # 2 vCPU, 4 GiB RAM
    "2_8": t2.large       # 2 vCPU, 8 GiB RAM
 ```
<br>
<br>
Then we have four tasks. The first task is used to gather the CPU, RAM and storage values from the request. The second task uses the CPU and RAM values to decide on an instance type, using the instance type map. The third is a simple debug task to output information relevant to the VM. The fourth and final task uses the amazon.aws.ec2_instance module to create the EC2 instance with given value. Bare in mind, this is for demo purposes only and lots of the parameters have been hardcoded for this reason. (This is not best practice.) Adjust the hardcoded parameters to suit your environment.
<br>
<br>
That's it for the automation piece, lets get back to rulebooks.
<br>
<br>
You can delete your existing rulebook activation, that was only for testing purposes. We now we need to create a new rulebook activation that uses the snow_catalog_request.yml rulebook. Found under the rulebooks directory.

![alt text](images/snow_catalog_request_rulebook.png "Event Streams")
<br>
<br>
Once that rulebook activation is running we go ahead and test this and see what happens.

Demo Running Instructions
------------
1. Go to All > Catalogs. Then click into Technical Catalog. From that window, you will see 'VM Provisioning' under Services. Click on that.
<br>
<br>
Complete the form with example vm details, make sure you select 'Testing' as the business purpose. Also make sure you select a CPU and RAM combination compatible with an ec2 instance_type_map we showed earlier. Example: **2 vCPU, 4 GiB** RAM OR **2 vCPU, 8 GiB RAM.**

1. Now we need to approve that request. Go to All > Self Service > My Approvals. You will see a new approval requested. Approve that request.

1. Go back to AAP. Click Automation Execution > Jobs. You will see the EDA Enrich ServiceNow REQ run, quickly followed by the Provision Test VM.

1. Log onto you AWS environment. You will see a new ec2 instance running with the tag Environment = Testing. 
1. Optional: Repeat the steps but this time select "Special Projects" as business purpose. You will see that it does the same enrichment job, but then runs "Provision Special Project VM" job template instead.
<br>
<br>

Summary
------------
To be completed

Troubleshooting
------------
**Certs - SSLPeerUnverifiedException error**
<br>
If you're getting this issue whenrunning the script on Service Now targeting EDA. You may need to add the root CA cert to SNOW. Make sure to use the cert corresponding to the load balancer if you have a HA installation.
<br>
Instructions: Go to System Definition > Certificates in your SNOW instance, you can add your root CA cert there.
<br>
<br>


