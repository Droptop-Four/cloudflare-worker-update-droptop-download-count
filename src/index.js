import * as Realm from 'realm-web';
import { Toucan } from 'toucan-js';

const {
	BSON: { ObjectId },
} = Realm;

async function realmLogin(appId, apiKey) {
	const app = new Realm.App({ id: appId });
	const credentials = Realm.Credentials.apiKey(apiKey);
	const user = await app.logIn(credentials);
	console.assert(user.id === app.currentUser.id);
	return user;
}

async function getReleasesDownloads(apiKey) {
	async function fetchData(url) {
		let allReleases = [];
		let page = 1;
		let response;

		do {
			response = await fetch(`${url}?page=${page}`, {
				method: 'GET',
				headers: {
					Accept: 'application/vnd.github+json',
					Authorization: `Bearer ${apiKey}`,
					'X-GitHub-Api-Version': '2022-11-28',
					'User-Agent': 'update-droptop-download-count',
				},
			});
			if (!response.ok) {
				throw new Error(`Failed to fetch data: ${response.statusText}`);
			}
			const releases = await response.json();
			allReleases = [...allReleases, ...releases];
			const linkHeader = response.headers.get('link');
			if (!linkHeader || !linkHeader.includes('rel="last"')) {
				break;
			}
			page++;
		} while (true);

		return allReleases;
	}

	const releasesUrl = 'https://api.github.com/repos/Droptop-Four/Droptop-Four/releases';
	const releases = await fetchData(releasesUrl);

	let basic_downloads = 0;
	let update_downloads = 0;

	for (const release of releases) {
		if (release.assets.length >= 2) {
			basic_downloads += release.assets[0].download_count;
			update_downloads += release.assets[1].download_count;
		}
	}

	return { basic_downloads, update_downloads };
}

async function getSupporterDownloads(apiKey) {
	async function fetchData(url) {
		let response;

		response = await fetch(`${url}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKey}`,
			},
		});
		if (!response.ok) {
			throw new Error(`Failed to fetch data: ${response.statusText}`);
		}
		const data = await response.json();

		return data.products[0].sales_count;
	}

	const url = 'https://api.gumroad.com/v2/products';
	const data = await fetchData(url);

	return data;
}

export default {
	async scheduled(event, env, ctx) {
		const sentry = new Toucan({
            dsn: env.SENTRY_DSN,
            context: ctx,
        });

		const user = await realmLogin(env.REALM_APPID, env.REALM_APIKEY);
		const collection = user.mongoClient('mongodb-atlas').db(env.DB).collection(env.COLLECTION);

		try {
			const { basic_downloads, update_downloads } = await getReleasesDownloads(env.GITHUB_APIKEY);
			const supporter_downloads = await getSupporterDownloads(env.GUMROAD_APIKEY);
			await collection.updateOne({ title: 'downloads' }, { $set: { basic_downloads, update_downloads, supporter_downloads } });
			console.log('Downloads updated successfully');
		} catch (error) {
            sentry.captureException(error);
			console.error('Error updating downloads:', error.message);
		}
	},
};
