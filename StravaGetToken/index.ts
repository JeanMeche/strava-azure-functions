import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import azure from 'azure-storage';
import fetch from 'node-fetch';

const tableName = 'azerty';

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  const responseMessage = 'Ok';
  context.res = {
    body: responseMessage,
  };

  const clientId = context.bindings.inputTable.find((row) => row.RowKey === 'ClientID').Value;
  const clientSecret = context.bindings.inputTable.find((row) => row.RowKey === 'ClientSecret').Value;
  const code = req.query['code'];
  const url = `https://www.strava.com/api/v3/oauth/token?client_id=${clientId}&client_secret=${clientSecret}&code=${code}&grant_type=authorization_code`;

  const tableService = azure.createTableService();

  return fetch(url, { method: 'POST' })
    .then((response) => response.json())
    .then((response) => {
      if (response.errors) {
        const errorMessage = `Error: ${response.errors[0].resource} : ${response.errors[0].code}`;
        context.res = {
          statut: 200,
          body: errorMessage,
        };
        throw new Error(errorMessage);
      }

      const updateRefreshToken = {
        PartitionKey: { _: 'Token' },
        RowKey: { _: 'RefreshToken' },
        Value: { _: response.refresh_token },
      };

      const updateAccessToken = {
        PartitionKey: { _: 'Token' },
        RowKey: { _: 'AccessToken' },
        Value: { _: response.access_token },
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
};

export default httpTrigger;
