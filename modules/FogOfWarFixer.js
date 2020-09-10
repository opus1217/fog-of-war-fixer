export const MODULE_NAME = "fog-of-war-fixer";

/*
8-Sep-2020      Created
9-Sep-2020      Force initialize/save of current FOW
                Renamed, separated into GM and client portions
*/



class FogOfWarFixer {
    constructor() {
        this.scene = canvas.scene;
        this.mergedFogData = null;
    }


    static init() {
        game.settings.register(MODULE_NAME, "fogOfWarFixerVersion", {
          name: `Fog of War Fixer ${game.i18n.localize("MH.Version")}`,
          hint: "",
          scope: "system",
          config: false,
          default: game.i18n.localize("FOWF.Version"),
          type: String
        });
    }

    static setup() {

    }

    async forceInitialize() {
        //Broadcast to all connected users; forces a user to re-initialize the scene which saves their FOW
        /*Do this with a fake Scene  update and then capture it with a hook on that
        */
        const response = await SocketInterface.dispatch("modifyDocument", {
              type: "Scene",
              action: "update",
              data: {_id : this.scene.id},
              options: {render : false, saveFog : true}
        });
    }

    async forceReload(allUsers) {
        //Broadcast to all connected users; forces a user to reload FOW for the scene from all listed users
        /*Do this with a fake Scene  update and then capture it with a hook on that
        */
        const response = await SocketInterface.dispatch("modifyDocument", {
              type: "Scene",
              action: "update",
              data: {_id : this.scene.id},
              options: {render : false, reloadFog : true, users: allUsers}
        });
    }


    static async synchronizeFog() {
        if (!canvas.scene) {return;}
        const fowFixer = new FogOfWarFixer();
        if (!fowFixer) {return;}

        //Merge FOW from all users, not just currently active/connected ones
        const allUsers = game.users.filter(user => !user.isGM);

        //Force all connected users to save current FOW (which is normally cached locally until a scene switch)
        await fowFixer.forceInitialize();
        //Force all connected users to reload ALL available FOW info (including from non-connected users)
        await fowFixer.forceReload(allUsers);
/*
        for (let user of activeUsers) {
            //Get FOW for this user
//FIXME - should see what happens if you query scene Fog without a user argument; maybe you get the union
            const fogData = await mapHelper.loadFog(user);
            //Merge positions with existing fogData
            mapHelper.mergeFogData(fogData);
        }

        //Now write out this as everybody's FOW
//NOTE: User information is included in the fogData itself
        if (!mapHelper.mergeFogData) {return;}
        for (let user of activeUsers) {
            mapHelper.mergedFogData.user = user.id;
            mapHelper.mergedFogData.scene = this.scene;
            //FIXME Note update .explored , not sure how serious that is
            mapHelper.mergeFogData.timestmp = Date.now();
            await canvas.sight._createOrUpdateFogExploration(mapHelper.mergedFogData);
        }
*/



        //And fake a reset of FOW - May not be necessary if this is pushed for the whoel scene


    }


    static getSceneControlButtons(buttons) {
        //Hooked on the left-hand set of buttons; add a synchronize fog one
        let lightButton = buttons.find(b => b.name === "lighting");

        if (lightButton && game.user.isGM) {
            lightButton.tools.push({
                name: "syncMap",
                title: game.i18n.localize("FOWF.BUTTON.SynchronizeMapAndFog"),
                icon: "fas fa-arrows-alt",
                toggle: false,
                button: true,
//FIXME: Shouldn't show the button unless tokenVision and FOW are active
                visible: game.user.isGM && canvas.sight.tokenVision && canvas.sight.fogExploration,
                onClick: () => FogOfWarFixer.synchronizeFog()
            });
        }
    }
}



Hooks.on("init", FogOfWarFixer.init);
Hooks.on('setup', FogOfWarFixer.setup);
Hooks.on('getSceneControlButtons', FogOfWarFixer.getSceneControlButtons);
