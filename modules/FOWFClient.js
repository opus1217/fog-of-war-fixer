import {MODULE_NAME} from './FogOfWarFixer.js';

/*
Listen for fake Scene updates and save or read Fog of War data
9-Sep-2020      Created
*/



class FOWFClient {
    async loadFog(user) {
        //Basically just a copy of SightLayer.loadFog() but for an arbitrary user

        // Load existing FOW exploration data
        const response = await SocketInterface.dispatch("modifyDocument", {
          type: "FogExploration",
          action: "get",
          data: {user: user.id, scene: canvas.scene.id}
        });
        const fogData = response.result;
        return fogData;
    }

    //NOT CURRENTLY USED
    mergeFogData(newFogData) {
        if (!newFogData) {return;}
        if (this.mergedFogData === null) {
            this.mergedFogData = newFogData;
        } else {
            newFogData.positions.forEach((position, i) => {
                const newCoords = position.coords;
                const existingPos = this.mergeFogData[newCoords];
                //Copied from SightLayer.updateFog()
                const explored = existingPos && (existingPos.limit !== true) && (existingPos.radius >= position.radius);
                if (!explored) {
                    //Update or create an entry
                    const radius = position.radius;
                    const limit = position.limit;
                    this.mergedFogData.positions[newCoords] = {radius, limit};
                }
            });
        }
    }


    static async reloadFogFromUsers(users) {
        //As Sightlayer.loadFog() except we read the specified user's Fog data
        // Load existing FOW exploration data
        if (!users || !users.length) {return;}

        // Take no further action if vision or fog is not used
        if ( !canvas.sight.tokenVision || !canvas.sight.fogExploration ) {return;}

        // Remove the previous render texture if one exists
        canvas.sight.fog.rendered.texture.destroy(true);

        for (let user of users) {
        // Load existing FOW exploration data
            const response = await SocketInterface.dispatch("modifyDocument", {
                  type: "FogExploration",
                  action: "get",
                  data: {userId : user.id, scene: canvas.scene.id}    //Excluded userID
            });

            // Apply the existing FOW progress
            const fogData = response.result;
            if ( !fogData ) return;
            mergeObject(canvas.sight.fogData, fogData);

            // Extract the fog data image
            let render = tex => canvas.sight.fog.rendered.texture = tex;
            await new Promise(resolve => {
                let tex = PIXI.Texture.from(canvas.sight.fogData.explored);
                if ( tex.baseTexture.valid ) {
                    render(tex);
                    resolve();
                }
                else tex.on("update", tex => {
                    render(tex);
                    resolve();
                });
                console.log(`Reloaded Fog of War exploration progress for User ${game.user.name} in Scene ${canvas.scene.name} from user ${user.name}`);
            });
        }//end for userID
    }

    static async handleUpdateScene(scene, data, options, userID) {
        //forceInitialize() on the GM user sends a fake Scene update message that then triggers this on on each active client
        if (!scene || !options) {return;}
        if (options.saveFog) {
            console.log(`Re-initializing sight layer to commit/save Fog`);
            await canvas.sight.initialize();
        } else if (options.reloadFog && options.userIDs) {
            console.log("Reloading scene map/FOW");
            await FOWFClient.reloadFogFromUsers(options.userIDs);
        }
    }

}

Hooks.on(`updateScene`,FOWFClient.handleUpdateScene);
