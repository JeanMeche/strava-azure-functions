# strava-azure-functions
Azure Functions to retrieve Strava Data 


## Strava Token Renewer

An Azure Timer Function to renew the AccessToken every 5 hours with the refresh token and storing it in a Azure-storage table.

## Strava Latest Activity

An Azure HTTP trigger function to retrieve my latest strava actitvity using the AccessToken stored in the Azure-storage table
