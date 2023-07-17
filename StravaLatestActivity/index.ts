import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import fetch from 'node-fetch';

const httpTrigger: AzureFunction = function (context: Context, req: HttpRequest): Promise<void> {
  const accessToken = context.bindings.inputTable.find((entry) => entry.RowKey === 'AccessToken')?.Value;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
  };

  return getLatestActivity()
    .then(([rideActivity, runActivity]) =>
      Promise.all([getActivityById(rideActivity.id), getActivityById(runActivity.id), getAthleteStats()])
    )
    .then(([rideActivity, runActivity, stats]) => {
      const returnObject = {
        ride: {
          id: rideActivity.id,
          name: rideActivity.name,
          distance: rideActivity.distance,
          start_date: rideActivity.start_date,
          moving_time: rideActivity.moving_time,
          photoUrl: Object.values(rideActivity.photos?.primary?.urls ?? {}).pop(),
          year_to_date_total_distance: stats.ytd_ride_totals.distance,
          totalTarget: 4000 * 1000,
        },
        run: {
          id: runActivity.id,
          name: runActivity.name,
          distance: runActivity.distance,
          start_date: runActivity.start_date,
          moving_time: runActivity.moving_time,
          photoUrl: Object.values(runActivity.photos?.primary?.urls ?? {}).pop(),
          year_to_date_total_distance: stats.ytd_run_totals.distance,
          totalTarget: 500 * 1000,
        },
      };

      return context.res.json(returnObject);
    });

  function getActivityById(activityId): Promise<DetailedActivity> {
    const url = `https://www.strava.com/api/v3/activities/${activityId}`;
    return myfetch<DetailedActivity>(url);
  }

  function getLatestActivity(): Promise<[ActivitySummary, ActivitySummary]> {
    const url = 'https://www.strava.com/api/v3/athlete/activities';

    return myfetch<ActivitySummary[]>(url).then((activities) => {
      return [activities.find((ac) => ac.type === 'Ride'), activities.find((ac) => ac.type === 'Run')];
    });
  }

  function getAthleteStats(athleteId = 6914721): Promise<ActivityStats> {
    // 6914721 that's me
    const url = `https://www.strava.com/api/v3/athletes/${athleteId}/stats`;
    return myfetch<ActivityStats>(url);
  }

  function myfetch<T>(url: string): Promise<T> {
    return fetch(url, { headers }).then(async (resp: Response) => {
      if (resp.status >= 400) {
        const json = await resp.json();
        throw new Error(`${resp.status} - ${resp.statusText} - ${json.message}`);
      }

      return resp.json();
    });
  }
};

export default httpTrigger;

interface ActivitySummary {
  id: number;
  type: ActivityType;
  name: string;
  distance: number;
}

interface ActivityStats {
  biggest_ride_distance: number;
  biggest_climb_elevation_gain: number;

  // last 4 weeks
  recent_run_totals: ActivityTotal;
  recent_swim_totals: ActivityTotal;
  recent_ride_totals: ActivityTotal;

  // current year
  ytd_swim_totals: ActivityTotal;
  ytd_ride_totals: ActivityTotal;
  ytd_run_totals: ActivityTotal;

  // all time
  all_run_totals: ActivityTotal;
  all_ride_totals: ActivityTotal;
  all_swim_totals: ActivityTotal;
}

interface ActivityTotal {
  distance: 5.962134;
  achievement_count: 9;
  count: 1;
  elapsed_time: 2;
  elevation_gain: 7.0614014;
  moving_time: 5;
}

interface DetailedActivity {
  id: number;
  name: string;
  distance: number;
  type: ActivityType;
  start_date: string;
  moving_time: number;
  photos: PhotoSummary;
}

type ActivityType =
  | 'Run'
  | 'Ride'
  | 'BackcountrySki'
  | 'EBikeRide'
  | 'IceSkate'
  | 'Swim'
  | 'NordicSki'
  | 'Hike'
  | 'Walk';

interface PhotoSummary {
  count: number;
  primary: PhotoSummary_primary;
}

interface PhotoSummary_primary {
  id: number;
  urls: Record<string, string>;
}
