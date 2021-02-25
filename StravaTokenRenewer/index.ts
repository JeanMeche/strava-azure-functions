import { AzureFunction, Context } from "@azure/functions";
import fetch from "node-fetch";
import azure from 'azure-storage';

const tableName = 'azerty';
const grantType = 'refresh_token';

const timerTrigger: AzureFunction = async function (context: Context, myTimer: any): Promise<void> {
    const tableService = azure.createTableService();
    const query = new azure.TableQuery()
        .where("RowKey eq 'ClientID' or RowKey eq 'ClientSecret' or RowKey eq 'RefreshToken'");
    tableService.queryEntities<any>(tableName, query, null, (error, result, response) => {
        if (!error) {
            let clientID, refreshToken, clientSecret;
            result.entries.forEach(item => {
                if (item.RowKey._ === 'ClientID') {
                    clientID = item.Value._;
                } else if (item.RowKey._ === 'ClientSecret') {
                    clientSecret = item.Value._;
                } else if (item.RowKey._ === 'RefreshToken') {
                    refreshToken = item.Value._;
                }
            });

            const queries = `client_id=${clientID}&client_secret=${clientSecret}&refresh_token=${refreshToken}&grant_type=${grantType}`;
            const url = `https://www.strava.com/oauth/token?${queries}`;

            fetch(url, { method: 'POST' })
                .then(response => response.json())
                .then(response => {
                    const updateRefreshToken = {
                        PartitionKey: { '_': 'Token' },
                        RowKey: { '_': 'RefreshToken' },
                        Value: { '_': response.refresh_token }
                    };

                    const updateAccessToken = {
                        PartitionKey: { '_': 'Token' },
                        RowKey: { '_': 'AccessToken' },
                        Value: { '_': response.access_token }
                    };

                    const batch = new azure.TableBatch();
                    batch.replaceEntity(updateRefreshToken);
                    batch.replaceEntity(updateAccessToken);

                    tableService.executeBatch(tableName, batch, function (error, result, response) {
                        context.done();
                    });
                })
                .catch((err) => {
                    context.done();
                });
        } else {
            context.done()
        }
    });
};

export default timerTrigger;
