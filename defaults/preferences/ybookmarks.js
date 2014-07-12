// See http://kb.mozillazine.org/Localize_extension_descriptions
pref("extensions.ybookmarks@yahoo.description", "chrome://ybookmarks/locale/ybookmarks.properties");
pref("extensions.ybookmarks@yahoo.engine.installed", false);
pref("extensions.ybookmarks@yahoo.addmechanism", 1);
pref("extensions.ybookmarks@yahoo.log", false);
pref("extensions.ybookmarks@yahoo.debug", false);
pref("extensions.ybookmarks@yahoo.bookmark.sync.interval", 10);
pref("extensions.ybookmarks@yahoo.bookmark.request.timeout", 90);
pref("extensions.ybookmarks@yahoo.bookmark.threshold", 2000 );
pref("extensions.ybookmarks@yahoo.sync.chunk.wait", 2000 );
pref("extensions.ybookmarks@yahoo.sync.chunk.size", 50 );
pref("extensions.ybookmarks@yahoo.sync.attempts", 5 );
pref("extensions.ybookmarks@yahoo.show.localonly.option", false);
pref("extensions.ybookmarks@yahoo.tagsview.overflow.enable", false); 
pref("extensions.ybookmarks@yahoo.tagsview.overflow.remove_from_toplevel", false); 
pref("extensions.ybookmarks@yahoo.tagsview.overflow.level", 40); 
pref("extensions.ybookmarks@yahoo.tagsview.overflow.spillover.max", 5); 
pref("extensions.ybookmarks@yahoo.tagsview.overflow.spillover.minsize", 3);
pref("extensions.ybookmarks@yahoo.toolbar.view", 0);
pref("extensions.ybookmarks@yahoo.original.ui.hide", false);
pref("extensions.ybookmarks@yahoo.original.add.suggest.delicious", true);
pref("extensions.ybookmarks@yahoo.original.keyword.conflicts.warn", true);
pref("extensions.ybookmarks@yahoo.deliciousmenu.hidetagsmenu", false );
pref("extensions.ybookmarks@yahoo.bookmark.notes.truncate_automatically", false );
pref("extensions.ybookmarks@yahoo.bookmark.title.truncate_automatically", false );
pref("extensions.ybookmarks@yahoo.bookmark.shareMessage.truncate_automatically", false );
pref("extensions.ybookmarks@yahoo.bookmark.delete.warn", true);
pref("extensions.ybookmarks@yahoo.bundles.menu.include_bookmarks", true);
pref("extensions.ybookmarks@yahoo.bundles.warn.delete", true);
pref("extensions.ybookmarks@yahoo.sidebar.keep_opened", false);
pref("extensions.ybookmarks@yahoo.bookmark.delete.warn", true);
pref("extensions.ybookmarks@yahoo.bundles.menu.include_bookmarks", true);
pref("extensions.ybookmarks@yahoo.sidebar.keep_opened", false);

//pref("extensions.ybookmarks@yahoo.statusbaricons.include_tagometer", false);
pref("extensions.ybookmarks@yahoo.statusbaricons.include_linksforyou", true);
pref("extensions.ybookmarks@yahoo.statusbaricons.disable_networkreminder", false);
pref("extensions.ybookmarks@yahoo.statusbaricons.disable_delicious_icon", false);
pref("extensions.ybookmarks@yahoo.statusbaricons.networkpoll.interval", 600);
pref("extensions.ybookmarks@yahoo.statusbaricons.alertpoll.interval", 600);
pref("extensions.ybookmarks@yahoo.engine.current.mode", "standard");
pref("extensions.ybookmarks@yahoo.engine.set.mode", "");
pref("extensions.ybookmarks@yahoo.contextmenu.hide", false);
pref("extensions.ybookmarks@yahoo.livemarkUpdate.interval", 5);
pref("extensions.ybookmarks@yahoo.engine.revert.standard.mode", false);
pref("extensions.ybookmarks@yahoo.tagSuggestionWait.interval", 1500); //1.5 seconds
pref("extensions.ybookmarks@yahoo.jump.tagType", "user"); //can hold two values [user, recent]
pref("extensions.ybookmarks@yahoo.remind.enable.cookie", true);
pref("extensions.ybookmarks@yahoo.statusbaricons.alertLastTitle", "");

//Keyboard shortcuts
pref("extensions.ybookmarks@yahoo.original.keybindings.remap", true);
pref("extensions.ybookmarks@yahoo.keybindings.add.orig.key", "D");
pref("extensions.ybookmarks@yahoo.keybindings.add.orig.modifiers", "accel");
pref("extensions.ybookmarks@yahoo.keybindings.sidebar.orig.key", "B");
pref("extensions.ybookmarks@yahoo.keybindings.sidebar.orig.modifiers", "accel");
pref("extensions.ybookmarks@yahoo.keybindings.add.key", "L");
pref("extensions.ybookmarks@yahoo.keybindings.add.modifiers", "accel,shift");
pref("extensions.ybookmarks@yahoo.keybindings.sidebar.key", "S");
pref("extensions.ybookmarks@yahoo.keybindings.sidebar.modifiers", "accel,shift");
pref("extensions.ybookmarks@yahoo.keybindings.delBookmarkPage.key", "D");
pref("extensions.ybookmarks@yahoo.keybindings.delBookmarkPage.modifiers", "accel");
pref("extensions.ybookmarks@yahoo.keybindings.delSidebar.key", "B");
pref("extensions.ybookmarks@yahoo.keybindings.delSidebar.modifiers", "accel");
pref("extensions.ybookmarks@yahoo.keybindings.bookmarksOnDelicious.key", "K");
pref("extensions.ybookmarks@yahoo.keybindings.bookmarksOnDelicious.modifiers", "accel,shift");
pref("extensions.ybookmarks@yahoo.keybindings.jumpToTag.key", "Y");
pref("extensions.ybookmarks@yahoo.keybindings.jumpToTag.modifiers", "accel,shift");

//Awesome bar prefs
pref("extensions.ybookmarks@yahoo.awesomebar.showDeliciousSearch", false);
pref("extensions.ybookmarks@yahoo.awesomebar.maxHistoryRows", 4);
pref("extensions.ybookmarks@yahoo.awesomebar.maxRowsInDeliciousSearch", 8);
pref("extensions.ybookmarks@yahoo.awesomebar.deliciousSearchOrderBy", "Site");
pref("extensions.ybookmarks@yahoo.awesomebar.showOnlyDeliciousSearch", false);
pref("extensions.ybookmarks@yahoo.awesomebar.showDeliciousTags", false);

pref("extensions.ybookmarks@yahoo.extension.disabled", false);
pref("extensions.ybookmarks@yahoo.extension.disabled.confirmed", false);

//share prefs
pref("extensions.ybookmarks@yahoo.addbookmark.lastSelectedProvider", "");

//persist classic mode tag window size
pref("extensions.ybookmarks@yahoo.addbookmark.windowWidth", 650);
pref("extensions.ybookmarks@yahoo.addbookmark.windowHeight", 550);

//update favicons when idle
pref("extensions.ybookmarks@yahoo.updateFaviconsWhenIdle", true);

//dont show logout dialog
pref("extensions.ybookmarks@yahoo.showLoggedOutDialog", true);

//keep your public bookmarks in sidebar on logout
pref("extensions.ybookmarks@yahoo.delicious.logout.status", "keep");

//default sidebar search mode is 'fullText'
pref("extensions.ybookmarks@yahoo.sidebar.searchMode", "fullText");