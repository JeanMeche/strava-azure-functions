import { AzureFunction, Context, HttpRequest } from "@azure/functions"


const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log('HTTP trigger function processed a request.');
    const clientId = context.bindings.inputTable.Value;
    const responseType = 'code';
    const url = new URL(req.url);
    const callbackUrl = `${url.origin}/api/StravaGetToken`;
    const scope = "read_all,activity:read_all"

    const stravaUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=${responseType}&redirect_uri=${callbackUrl}&scope=${scope}`;
    context.res = {
        status: 302,
        headers: {
            Location: stravaUrl,
        },
        body: {}
    };

};

export default httpTrigger;