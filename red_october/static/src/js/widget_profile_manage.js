/* Copyright 2016-2017 LasLabs Inc.
 * License LGPL-3.0 or later (http://www.gnu.org/licenses/lgpl).
 */

odoo.define('red_october.WidgetProfileManage', function (require) {
    "use strict";

    var core = require('web.core');
    var Widget = require('web.Widget');
    var Model = require('web.DataModel');
    var DialogPasswordChange = require('red_october.DialogPasswordChange');
    var DialogPasswordGet = require('red_october.DialogPasswordGet');

    /* It allows a user to choose their current encryption profile.

        Attributes:
            currentProfile (obj): This is the current profile that is being
                used for crypto.
            currentPassword (str): This is the password being used for login
                to currentProfile.
            profiles (Set of obj): This represents all the profiles that the
                current user can access.
     */
    var WidgetProfileManage = Widget.extend({

        template: 'red_october.WidgetProfileManage',

        events: {
            'decrypt': 'doDecrypt',
            'encrypt': 'doEncrypt',
        },

        /* It sets the widget properties */
        init: function () {
            this._super(arguments);
            this.profiles = {};
            this.currentProfile = {};
            this.currentPassword = '';
        },

        /* It overloads the start handler to call the data loader. */
        start: function () {
            this._super();
            this.loadData();
        },

        /* It sets the event handlers */
        setHandlers: function () {
            this.$el.find('a.roProfileSelect').click(
                $.proxy(this.clickProfile, this)
            );
            this.$el.find('#roProfilePasswordChange').click(
                $.proxy(this.clickProfilePasswordChange, this)
            );
            this.$el.find('#roProfilePasswordGet').click(
                $.proxy(this.clickProfilePasswordGet, this)
            );
        },

        /* Load user profiles from the server, add them to the instance, then re-render. */
        loadData: function () {
            var RedOctoberUser = new Model('red.october.user');
            var self = this;
            var loadProfileCurrent = function(records) {
                if (!records.length){
                    return;
                }
                self.loadProfile(records[0], true);
            }
            var loadProfiles = function(records) {
                self.loadProfiles(records);
            }
            RedOctoberUser.call('read_current_user').then(loadProfileCurrent);
            RedOctoberUser.call('read_user_profiles').then(loadProfiles);
        },

        /* Load multiple profiles into the instance.

            Args:
                profile (obj): The RedOctoberUser profile to load.
         */
        loadProfiles: function(profiles) {
            _.each(profiles, $.proxy(this.loadProfile, this));
            this.renderElement();
        },

        /* Load a single profile into the instance.

            Args:
                profile (obj): The RedOctoberUser profile to load.
                current (bool): True if this profile represents the current session profile.
         */
        loadProfile: function (profile, current) {
            this.profiles[profile.id] = profile;
            if (current) {
                this.selectProfile(profile.id);
            }
        },

        /* Render the dropdown and set click handler for the items. */
        renderElement: function () {
            this._super();
            if (false && Object.keys(this.profiles).length < 2) {
                this.$el.hide();
            } else {
                this.$el.show();
            }
            this.setHandlers();
        },

        /* This method is called when a profile select item is cicked. */
        clickProfile: function (event) {
            var profileID = $(event.currentTarget).data('profile-id');
            var self = this;
            if (profileID === self.currentProfileID) {
                return;
            }
            var uri = '/red_october/profile/change/' + profileID;
            return self.rpc(uri).done(function () {
                $.proxy(self.selectProfile, self, profileID);
            });
        },

        clickProfilePasswordChange: function (event) {
            new DialogPasswordChange(this).open();
        },

        clickProfilePasswordGet: function (event) {
            new DialogPasswordGet(this).open();
        },

        /* It selects the profile given the ID */
        selectProfile: function (profileID) {
            var self = this;
            _.each(this.profiles, function (profile) {
                if (profile.id === profileID) {
                    self.currentProfile = profile;
                    self.currentPassword = '';
                }
            });
        },

        doEncrypt: function (event, field) {
            var self = this;
            var _encrypt = function () {
                self._crypt(field, 'encrypt').always(
                    function(response) {
                        field.handleCrypt(response.responseText);
                    }
                )
            };
            if (!this.currentPassword) {
                var dialog = new DialogPasswordGet(this);
                dialog.$modal.on('hide.bs.modal', _encrypt);
                dialog.open();
            } else {
                _encrypt();
            }
        },

        doDecrypt: function (event, field) {
            var self = this;
            var _decrypt = function () {
                self._crypt(field, 'decrypt').always(
                    function(response) {
                        field.handleCrypt(response.responseText, true);
                    }
                )
            };
            if (!this.currentPassword) {
                var dialog = new DialogPasswordGet(this);
                dialog.$modal.on('hide.bs.modal', _decrypt);
                dialog.open();
            } else {
                _decrypt();
            }
        },

        _crypt: function (field, method) {
            var uri = '/red_october/crypt/' + method;
            return $.ajax({
                method: 'POST',
                url: uri,
                data: {
                    data: field.get_value(),
                    password: this.currentPassword,
                    user_id: this.currentProfile.id,
                    csrf_token: odoo.csrf_token,
                },
                dataType: 'json',
            });
        }

    });

    return WidgetProfileManage;

});
