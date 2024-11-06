# cf-526-do-not-inspect
This is a Cloudflare Worker that functions as Logpush endpoint that looks for a HTTP 526 error (insecure upstream) and updates host or IP lists to be used in Do Not Inspect policies in Gateway.

Prerequisite for this is to have a Gateway HTTP Policy that uses HOST IN LIST yourHostList OR DestinationIP IN LIST yourIPList with an ACTION of Do Not Inspect.  
If a user hits a site deemed "insecure" upstream, the LogPush job will send the host/IP to the worker, the worker will update the appropriate list and subsequent requests to this origin will bypass TLS inspection and the end user will no longer see the 526 error.  Use accordingly.


It utilizes Variables and Secrets in the Worker setting for the following:

ACCOUNT_ID - your Cloudflare Account ID

API_KEY - your Global API Key

EMAIL - email used for your Global API Key

HOSTS_LIST_ID - Teams List used for hostname based Do Not Inspect policy

IPS_LIST_ID - Teams List used for IP address based Do Not Inspect policy


Logpush Configuration:
When you set up your Logpush job, the destination is the URL of this worker that you create. The Logpush job will be for the Gateway HTTP dataset.
You only need to send HTTPHost. And you only need to send if HTTPStatusCode = "526"
