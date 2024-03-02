import * as Realm from "realm-web";

const {
    BSON: { ObjectId },
} = Realm;


async function login(appId, apiKey) {
    const app = new Realm.App({ id: appId });
    const credentials = Realm.Credentials.apiKey(apiKey);
    const user = await app.logIn(credentials);
    console.assert(user.id === app.currentUser.id);
    return user;
}


async function getReleasesDownloads(privateKey) {

	async function fetchData(url) {
		let allReleases = [];
		let page = 1;
		let response;
	
		do {
			response = await fetch(`${url}?page=${page}`, {
				method: "GET",
				headers: {
					Accept: "application/vnd.github+json",
					Authorization: `Bearer ${privateKey}`,
					"X-GitHub-Api-Version": "2022-11-28",
					"User-Agent": "update-droptop-download-count",
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
	
    const releasesUrl = "https://api.github.com/repos/Droptop-Four/Droptop-Four/releases";
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


export default {
    async scheduled(event, env, ctx) {
        const user = await login(env.REALM_APPID, env.REALM_APIKEY);
        const collection = user.mongoClient("mongodb-atlas").db(env.DB).collection(env.COLLECTION);

        try {
            const { basic_downloads, update_downloads } = await getReleasesDownloads(env.GITHUB_APIKEY);
            await collection.updateOne({ title: "downloads" }, { $set: { basic_downloads, update_downloads } });
            console.log("Downloads updated successfully");
        } catch (error) {
            console.error("Error updating downloads:", error.message);
        }
    },
};
