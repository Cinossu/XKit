//* TITLE Blog Tracker **//
//* VERSION 0.3 REV F **//
//* DESCRIPTION Track people like tags **//
//* DEVELOPER STUDIOXENIX **//
//* DETAILS Blog Tracker lets you track blogs like you can track tags. Add them on your dashboard, and it will let you know how many new posts they've made the last time you've checked their blogs, or if they've changed their URLs. **//
//* FRAME false **//
//* BETA false **//

XKit.extensions.people_notifier = new Object({

	running: false,
	apiKey: "fuiKNFp9vQFvjLNvx4sUwti4Yb5yGutBN4Xh10LXZhhRKjWlV4",

	blogs: new Array(),

	preferences: {

		"view_on_dash": {

			text: "Use View on Dash to open blogs (requires View On Dash to be installed)",
			value: false,
			default: false

		}


	},

	max_tracks: 10,
	/*check_interval: 600000,*/
	check_interval: 600000,

	frame_run: function() {

		var username = $("#tumblelog_name").attr("data-tumblelog-name");
		console.log("people-notifier -> in blog of " + username + ", checking to see if we should mark it checked.");

		XKit.extensions.people_notifier.load_blogs();

		if (XKit.extensions.people_notifier.check_if_in_list(username) !== true) {console.log("|-- not in person track list."); return; }

		for (var person in XKit.extensions.people_notifier.blogs) {
			if (XKit.extensions.people_notifier.blogs[person].url === username) {
				console.log("|-- found and replaced last_check.");
				XKit.extensions.people_notifier.blogs[person].last_check = new Date().getTime();
				XKit.extensions.people_notifier.blogs[person].count = 0;
				XKit.extensions.people_notifier.save();
				break;
			}
		}

	},

	set_read_count: function(username, count) {

		for (var person in XKit.extensions.people_notifier.blogs) {
			if (XKit.extensions.people_notifier.blogs[person].url === username) {
				XKit.extensions.people_notifier.blogs[person].count = count;
				XKit.extensions.people_notifier.save();
				return;
			}
		}

	},

	load_blogs: function() {

		var blogs_str = XKit.storage.get("people_notifier","blogs","");

		var blogs_obj;

		try {
			blogs_obj = JSON.parse(blogs_str);
		} catch(e) {
			blogs_obj = new Array();
		}

		this.blogs = blogs_obj;

		console.log(this.blogs);

	},

	run: function() {
		this.running = true;

		XKit.tools.init_css("people_notifier");

		if ($("#dashboard_controls_open_blog").length === 0) {
			return;
		}

		this.load_blogs();

		if ($(".post").length > 0) {

			XKit.post_listener.add("people_notifier", XKit.extensions.people_notifier.do_posts);
			this.do_posts();

		}

		this.list_blogs();

	},

	do_posts: function() {

		var posts = XKit.interface.get_posts("xkit-people-notifier-checked");

		$(posts).each(function() {

			$(this).addClass("xkit-people-notifier-checked");

	  		var m_post = XKit.interface.post($(this));

			if (XKit.extensions.people_notifier.check_if_in_list(m_post.owner) !== true) {
				return;
			}

			XKit.extensions.people_notifier.add_to_read_posts_list(m_post.owner, m_post.id);

		});

		XKit.extensions.people_notifier.save();

	},

	add_to_read_posts_list: function(url, post_id) {

		for (var i=0;i<XKit.extensions.people_notifier.blogs.length;i++) {

			if (XKit.extensions.people_notifier.blogs[i].url === url) {

				/*var highest_number = -1;
				if (typeof XKit.extensions.people_notifier.blogs[i].last_20_posts === "undefined") {
					XKit.extensions.people_notifier.blogs[i].last_20_posts = new Array();
				} else {
					highest_number = Math.max.apply(Math, XKit.extensions.people_notifier.blogs[i].last_20_posts);
				}

				if (highest_number !== -1 && XKit.extensions.people_notifier.blogs[i].last_20_posts.length >= 20) {
					if (post_id <= highest_number) { console.log("Not adding " + parseInt(post_id) + " to 20 list, older post! [ max = " + highest_number + "]"); return; }
				}*/

				if (XKit.extensions.people_notifier.blogs[i].last_20_posts.length >= 20) {
					XKit.extensions.people_notifier.blogs[i].last_20_posts.pop();
				}

				if (XKit.extensions.people_notifier.blogs[i].last_20_posts.indexOf(parseInt(post_id)) === -1) {
					console.log("Adding " + parseInt(post_id) + " to list.");
					XKit.extensions.people_notifier.blogs[i].last_20_posts.unshift(parseInt(post_id));
				}

			}

		}

	},

	check_if_in_list: function(url) {

		for (var i=0;i<XKit.extensions.people_notifier.blogs.length;i++) {

			//console.log(XKit.extensions.people_notifier.blogs[i].url + " --- " + url);
			if (XKit.extensions.people_notifier.blogs[i].url === url) { return true; }

		}

		return false;

	},

	save: function() {

		XKit.storage.set("people_notifier","blogs",JSON.stringify(XKit.extensions.people_notifier.blogs));

	},

	show_error: function(title, msg) {

		XKit.window.show(title, msg, "error", "<div class=\"xkit-button default\" id=\"xkit-close-message\">OK</div>");

	},

	show_error_on_sidebar_blog: function(url, changed) {

		if (!changed) {
			$("#xkit-people-notifier-for---" + url).addClass("people-notifier-error");
			$("#xkit-people-notifier-for---" + url).find(".count").html("error");
		} else {
			$("#xkit-people-notifier-for---" + url).addClass("people-notifier-changed");
			$("#xkit-people-notifier-for---" + url).find(".count").html("changed");
		}

	},

	check_blog: function(url, obj) {

		var api_url = "https://api.tumblr.com/v2/blog/" + url + ".tumblr.com/posts" + "?api_key=" + XKit.extensions.people_notifier.apiKey;

		GM_xmlhttpRequest({
			method: "GET",
			url: api_url,
			json: true,
			onerror: function(response) {
				console.log("people-notifier -> Error getting page.");
				XKit.extensions.people_notifier.show_error_on_sidebar_blog(url);
				return;
			},
			onload: function(response) {

				try {

					var data = JSON.parse(response.responseText).response;
					//console.log("people-notifier -> got data for " + url);
					console.log(" |-- last post timestamp = " + (data.posts[0].timestamp * 1000) + " vs last-check = " + obj.last_check);

					if (data.blog.posts === 0 || data.blog.posts <= 2) {
						XKit.extensions.people_notifier.show_error_on_sidebar_blog(url, true);
						return;
					}

					var do_continue_lads = true;
					var lad_count = -1;
					var found_count = 0;
					var post_id = 0;

					while (do_continue_lads) {

						lad_count++;
						if (lad_count >= 30) {break; }

						if (typeof data.posts[lad_count] == "undefined")
							continue;

						if (typeof obj.last_20_posts === "undefined") {
							obj.last_20_posts = new Array();
						}

						var add_this = true;

						if (typeof obj.last_post_id != "undefined" && typeof data.posts[lad_count].id != "undefined") {
							if (obj.last_post_id == data.posts[lad_count].id && obj.last_post_id !== 0) {
								console.log("people-notifier ----> Skipping, the last post seen. [" + obj.last_post_id + "]");
								//obj.count = 0;
								//do_continue_lads = false;
								break;
								add_this = false;
							}
						}

						if (typeof data.posts[lad_count] !== "undefined" && add_this != false) {
							if ((data.posts[lad_count].timestamp * 1000) >= obj.last_check) {
								console.log("\-- Found post = " + data.posts[lad_count].id);
								//if (
								found_count++;
							} else {
								console.log("\-- Older posts already checked.");
								do_continue_lads = false;
								break;
							}
						}

					}

					if (typeof data.posts[0].id != "undefined") {
						if (data.posts[0].id != 0) {
							obj.last_post_id = data.posts[0].id;
						}
					}

					obj.last_check = new Date().getTime();
					XKit.extensions.people_notifier.save();

					if (found_count > 0) {

						XKit.extensions.people_notifier.set_read_count(url, obj.count + found_count);

						$("#xkit-people-notifier-for---" + url).find(".count").html(obj.count + found_count);

					} else {

						console.log("people-notifier -> no unread posts found for " + url);

						if (typeof obj.count === "undefined"|| parseInt(obj.count) === 0) {
							$("#xkit-people-notifier-for---" + url).find(".count").html("");
						} else {
							$("#xkit-people-notifier-for---" + url).find(".count").html(obj.count);
						}

					}

				} catch(e) {
					console.log("people-notifier -> Error parsing data. " + e.message);
					XKit.extensions.people_notifier.show_error_on_sidebar_blog(url);
					return;
				}

			}
		});

	},

	list_blogs: function() {

		var m_html = "";

		$("#xpeoplenotifier").remove();

		if (this.blogs.length === 0) {

			m_html = 	"<div id=\"xkit-people-notifier-no-blogs\">" +
						"You have no tracked blogs.<br/>Add one below." +
					"</div>";

		} else {

			var current_ms = new Date().getTime();

			for (var i=0;i<this.blogs.length;i++) {

				m_html = m_html + 	"<li id=\"xkit-people-notifier-for---" + this.blogs[i].url + "\" data-url=\"" + this.blogs[i].url + "\" class=\"no_push xkit-people-notifier-person\">" +
								"<img src=\"http://api.tumblr.com/v2/blog/" + this.blogs[i].url + ".tumblr.com/avatar/16\" class=\"people-notifier-avatar\">" +
								"<a>" +
									"<div class=\"hide_overflow\">" + this.blogs[i].url + "</div>";


				var difference = current_ms - this.blogs[i].last_check;

				if (difference <= -1 ||difference >= XKit.extensions.people_notifier.check_interval) {
					//console.log("Going to check for " + this.blogs[i].url);
					m_html = m_html + "<div class=\"count\">loading</div>";
					this.check_blog(this.blogs[i].url, this.blogs[i]);
				} else {
					if (this.blogs[i].count === 0) {
						m_html = m_html + "<div class=\"count\"></div>";
					}else {
						m_html = m_html + "<div class=\"count\">" + this.blogs[i].count + "</div>";
					}
				}

				m_html = m_html + "</a></li>";

			}

		}


		m_html = m_html + "<li id=\"xkit-people-notifier-new-btn\" class=\"no_push xkit-people-notifier-new\"><a class=\"members\"><div class=\"\">Add a new person</div></a></li>";

		m_html = '<ul class="controls_section" id="xpeoplenotifier"><li class=\"section_header selected\">TRACKED BLOGS</li>' + m_html + '</ul>';

		if ($("ul.controls_section:eq(1)").length > 0) {
			if ($("#xim_small_links").length > 0) {
				$("#xim_small_links").after(m_html);
			} else {
				$("ul.controls_section:eq(1)").after(m_html);
			}
		} else {
			$("#right_column").prepend(m_html);
		}

		$(".xkit-people-notifier-person").bind("click", function(event) {

			if (event.altKey) {
				XKit.extensions.people_notifier.remove_from_list($(this).attr('data-url'));
				return;
			}

			if ($(this).hasClass("people-notifier-error")) {
				XKit.window.show("Error fetching.", "<b>Blog Tracker was unable to fetch information about the blog \"" + $(this).attr('data-url') + "\".</b><div style=\"margin-top: 15px;\">It might be due to a recent Tumblr change or bug, or that the person changed their URL. Try refreshing the page or click on Open In New Tab to check if they have deleted their blog or changed their URL.</div>","error","<a href=\"http://" + $(this).attr('data-url') + ".tumblr.com/\" target=\"_BLANK\" class=\"xkit-button default\">Open in new tab</a><div class=\"xkit-button\" id=\"people-notifier-delete-this\">Remove from track list</div><div class=\"xkit-button\" id=\"xkit-close-message\">Cancel</div>");

				var m_obj = $(this);
				$("#people-notifier-delete-this").click(function() {
					XKit.extensions.people_notifier.remove_from_list($(m_obj).attr('data-url'));
				});

				return;
			}

			if ($(this).hasClass("people-notifier-changed")) {
				XKit.window.show("URL Changed?", "<b>Blog Tracker found no or less than 2 posts in the blog \"" + $(this).attr('data-url') + "\".</b><div style=\"margin-top: 15px;\">It might be due to a recent Tumblr change or bug, or that the person changed their URL. Try refreshing the page or click on Open In New Tab to check if they have deleted their blog or changed their URL.</div>","error","<a href=\"http://"  + $(this).attr('data-url') +  ".tumblr.com/\" target=\"_BLANK\" class=\"xkit-button default\">Open in new tab</a><div class=\"xkit-button\" id=\"people-notifier-delete-this\">Remove from track list</div><div class=\"xkit-button\" id=\"xkit-close-message\">Cancel</div>");

				var m_obj = $(this);
				$("#people-notifier-delete-this").click(function() {
					XKit.extensions.people_notifier.remove_from_list($(m_obj).attr('data-url'));
				});

				return;
			}

			var open_in_vod = false;
			if (XKit.extensions.people_notifier.preferences.view_on_dash.value === true) {

				if (XKit.installed.check("xcloud") === false) {
					open_in_vod = false;
				} else {
					if (XKit.extensions.xcloud.running === false) {
						open_in_vod = false;
					} else {
						open_in_vod = true;
					}
				}

			}

			if (!open_in_vod) {
				window.open("http://" + $(this).attr('data-url') + ".tumblr.com/");
			} else {
				try {

					XKit.extensions.people_notifier.load_blogs();
					for (var person in XKit.extensions.people_notifier.blogs) {
						if (XKit.extensions.people_notifier.blogs[person].url === $(this).attr('data-url')) {
							XKit.extensions.people_notifier.blogs[person].last_check = new Date().getTime();
							XKit.extensions.people_notifier.blogs[person].count = 0;
							XKit.extensions.people_notifier.save();
							break;
						}
					}

					XKit.extensions.view_on_dash.view($(this).attr('data-url'));

				} catch(e) {
					alert("Unable to use View On Dash to open blog.\nPlease try again later or file a bug report at xkit-extension.tumblr.com/ask with error code PEP-119A");
				}
			}

		});

		$("#xkit-people-notifier-new-btn").click(function() {

			if (XKit.extensions.people_notifier.blogs.length >= XKit.extensions.people_notifier.max_tracks) {
				XKit.window.show("No more slots", "<b>You can only track up to 10 people.</b><br/>Please untrack some to track new people.<br/><br/>To remove a person from list, hold the ALT key while clicking their username on the sidebar.","error","<div class=\"xkit-button default\" id=\"xkit-close-message\">OK</div>");
				return;
			}

			var remaining = XKit.extensions.people_notifier.max_tracks - XKit.extensions.people_notifier.blogs.length;

			XKit.window.show("Add a person to track list", "<b>Please enter the URL of the person to track:</b><input type=\"text\" maxlength=\"40\" placeholder=\"eg: xkit-extension\" class=\"xkit-textbox\" id=\"xkit-people-notifier-add-url\">You have <b>" + remaining + "</b> track slots left.<div style=\"margin-top: 10px; font-size: 12px; color: rgb(120,120,120);\">To remove a person from list afterwards, hold the ALT key while clicking their username on the sidebar.</div>", "question", "<div class=\"xkit-button default\" id=\"xkit-people-notifier-create\">Track URL</div><div class=\"xkit-button\" id=\"xkit-close-message\">Cancel</div>");

			$("#xkit-people-notifier-create").click(function() {

				to_add = $("#xkit-people-notifier-add-url").val().toLowerCase();

				if ($.trim(to_add) === "") {
					XKit.window.close();
					return;
				}

				if (/^[a-zA-Z0-9\-]+$/.test(to_add) === false) {
					XKit.extensions.people_notifier.show_error("Invalid username","Please enter the url only (ie: xkit-extension)");
					return;
				}

				if (XKit.extensions.people_notifier.check_if_in_list(to_add) !== false) {
					XKit.extensions.people_notifier.show_error("Already on the list","This user is already on your buddy list.");
					return;
				}

				var m_object = new Object();
				m_object.url = to_add;
				m_object.last_check = new Date().getTime() - 60000;
				m_object.count = 0;
				m_object.last_20_posts = new Array();
				m_object.last_post = 0;

				XKit.extensions.people_notifier.blogs.push(m_object);
				XKit.extensions.people_notifier.save();

				XKit.window.close();
				XKit.notifications.add("User <b>" + to_add + "</b> added to track list.");

				XKit.extensions.people_notifier.list_blogs();

			});

		});

	},

	remove_from_list: function(username) {

		XKit.window.show("Remove from list", "You sure you want to remove <b>" + username + "</b>?","question","<div data-to-remove=\"" + username + "\" id=\"pn-remove-user-button\" class=\"xkit-button default\">Remove</div><div id=\"xkit-close-message\" class=\"xkit-button\">Cancel</div>");

		$("#pn-remove-user-button").click(function(){

			XKit.window.close();
			var musername = $(this).attr("data-to-remove");

			for (var i=0;i<XKit.extensions.people_notifier.blogs.length;i++) {
				if (XKit.extensions.people_notifier.blogs[i].url === musername) {
					XKit.extensions.people_notifier.blogs.splice(i,1);
					XKit.extensions.people_notifier.save();
					XKit.extensions.people_notifier.list_blogs();
					return;
				}
			}



		});

	},

	destroy: function() {
		this.running = false;
	}

});