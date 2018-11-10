import Component from 'metal-component/src/Component';
import Soy from 'metal-soy/src/Soy';
import templates from './DependencyVisualization.soy';

class DependencyVisualization extends Component {

	constructor(opt_config) {
        super(opt_config);

        // define colors for nodes depending on directory it can be found in (directories as version 7.0.6 and compiled from source)
        this.bundledirs = {};
        this.defineFoldersAndColors();

        // map of bundles received from render command. It is an json object in following format
        // {0: bundle, 1: bundle, ...}
        this.bundlesMap = opt_config.bundles;
        this.bundleNodes = [];
        this.bundleLinks = [];
        this.prepareData();

        // size of the graph, also the size of svg defined in main.scss
        this.width = 5000;
        this.height = 5000;

        // bind "this" object to functions to prevent mistakes with reassiging of "this" object
        this.ticked = this.ticked.bind(this);
        this.tickend = this.tickend.bind(this);
        this.dblclick = this.dblclick.bind(this);
        this.onclick = this.onclick.bind(this);
        this.dragstart = this.dragstart.bind(this);
        this.dragdrag = this.dragdrag.bind(this);
        this.dragend = this.dragend.bind(this);

        // define the simulation
        this.simulation = d3.forceSimulation(this.bundleNodes) // define nodes of the simulation
            .force("link", d3.forceLink().distance(200).strength(0.1)) // links have length of 200 and are quite rigid
            .force("charge", d3.forceManyBody().strength(-10000).distanceMax(800).distanceMin(100)) // the nodes are replusing each other with a strong force
            .force("xAxis", d3.forceX(this.width/2).strength(0.1)) // gravitation is set to the center of the graph
            .force("yAxis", d3.forceY(this.height/2).strength(0.1))
            .force("collide", d3.forceCollide().radius(50)) // force collide prevents overlapping of nodes
            .on("tick", this.ticked) // function to be executed on every animation step
            .on("end" , this.tickend); // function called when the simulation concluded (stopped moving)

        this.simulation.force("link").links(this.bundleLinks); // define lnks between nodes

        // draw elements of graph using svg elements
        this.svg = d3.select("#graph").select("svg")
            .attr("width", this.width)
            .attr("height", this.height);

        this.link = this.svg.append("g")
            .attr("class", "links")
            .selectAll("line")
            .data(this.bundleLinks)
            .enter().append("line")
            .attr("stroke-width", 2)
            .style("stroke", "lightgrey")
            .style("opacity", "1");

        this.node = this.svg.selectAll(".node")
            .data(this.bundleNodes)
            .enter().append("g")
            .attr("class", "node");

        this.node.append("circle")
            .attr("r", 5)
            .attr("stroke", "#cccccc")
            .attr("fill", (d) => this.dircolors[d.dir])
            .attr("opacity",0.8)
            .on("dblclick", (d) => this.dblclick(d))
            .on("click", (d) => this.onclick(d));

        this.node.append("text")
            .attr("dx", 6)
            .attr("dy", 3)
            .style("font-size", "10px")
            .text((d) => d.name);

        // define behavior of nodes on drag events
        this.node.call(d3.drag()
            .on("start", (d) => { this.dragstart(d)})
            .on("drag", (d) => { this.dragdrag(d)})
            .on("end", (d) => { this.dragend(d)})
        );

    }

    ticked() {
	    // on every simulation step move nodes and links to newly calcuated positions
        this.node
            .attr("transform", (d) => {
                return "translate(" + d.x + "," + d.y + ")"
            });

        this.link
            .attr("x1", (d) =>  d.source.x)
            .attr("y1", (d) =>  d.source.y)
            .attr("x2", (d) =>  d.target.x)
            .attr("y2", (d) =>  d.target.y);
    }
    tickend() {}

    // when gragging starts the movement of the node is enabled
    dragstart(d) {
        if (!d3.event.active) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    dragdrag(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    // when gragging ends the node is fixated in place
    dragend(d) {
        if (!d3.event.active) this.simulation.alphaTarget(0);
        d.fx = d.x;
        d.fy = d.y;
    }

    // when clicked the dependencies of the node will be indicated
    onclick(d) {
	    // red indicated that clicked node depends on the connected node
        d3.selectAll("line")
            .filter(function(o) {
                return (o.source === d);
            })
            .style("stroke", "red");

        // ble indicated that clicked node is a dependency of the connected node
        d3.selectAll("line")
            .filter(function(o) {
                return (o.target === d);
            })
            .style("stroke", "blue");
    }

    // double click clears the indications for clicked node
    dblclick(d) {
        d3.selectAll("line")
            .filter(function(o) {
                return (o.source === d || o.target === d);
            })
            .style("stroke", "lightgrey");
    }

    // translate given data to the needed arrays
    prepareData() {
        for (let key in this.bundlesMap) {
            if (this.bundlesMap.hasOwnProperty(key)) {
                // add directory information for coloring
                this.bundlesMap[key].dir = this.bundledirs[this.bundlesMap[key].name] || "none";
                // assemble the array of nodes
                this.bundleNodes.push(this.bundlesMap[key]);

                // assemble the array of links
                let depOn = this.bundlesMap[key].dependsOn;
                for (let i = 0; i < depOn.length; i++) {
                    let dependency = depOn[i];
                    this.bundleLinks.push({source: this.bundlesMap[key], target: this.bundlesMap[dependency]});
                }
            }
        }
    }

    defineFoldersAndColors() {
        this.dirs = {
            core: ["com.liferay.portal.security.pacl", "com.liferay.portal.app.license.api", "com.liferay.portal.app.license.resolver.hook", "com.liferay.portal.equinox.log.bridge", "com.liferay.jaxws.osgi.bridge", "com.liferay.registry.impl", "com.liferay.portal.bootstrap", "com.liferay.osgi.felix.util", "com.liferay.osgi.service.tracker.collections", "org.eclipse.osgi"],
            modules: ["com.liferay.ip.geocoder.api", "com.liferay.site.my.sites.web", "com.liferay.ratings.page.ratings.web", "com.liferay.asset.tags.admin.web", "com.liferay.item.selector.upload.web", "com.liferay.journal.content.asset.addon.entry.related.assets", "com.liferay.journal.content.asset.addon.entry.common", "com.liferay.user.groups.admin.web", "com.liferay.journal.taglib", "com.liferay.adaptive.media.item.selector.upload.web", "com.liferay.sync.security", "com.liferay.social.networking.web", "com.liferay.portlet.configuration.sharing.web", "com.liferay.microblogs.api", "com.liferay.ip.geocoder", "com.liferay.my.subscriptions.web", "com.liferay.wiki.service", "com.liferay.contacts.web", "com.liferay.frontend.taglib.form.navigator", "com.liferay.frontend.editor.lang", "com.liferay.dynamic.data.mapping.expression", "com.liferay.portlet.configuration.icon.edit.guest", "com.liferay.site.api", "com.liferay.frontend.image.editor.capability.effects", "com.liferay.quick.note.web", "com.liferay.journal.content.web", "com.liferay.blogs.service", "com.liferay.mentions.api", "com.liferay.frontend.css.web", "com.liferay.document.library.web", "com.liferay.document.library.layout.set.prototype", "com.liferay.exportimport.api", "com.liferay.site.navigation.breadcrumb.web", "com.liferay.staging.portlet.data.handler", "com.liferay.push.notifications.api", "com.liferay.chat.web", "com.liferay.dynamic.data.mapping.io", "com.liferay.staging.lang", "com.liferay.expando.web", "com.liferay.dynamic.data.mapping.data.provider.impl", "com.liferay.adaptive.media.demo.data.creator.api", "com.liferay.layout.type.controller.full.page.application", "com.liferay.adaptive.media.image.impl", "com.liferay.exportimport.service", "com.liferay.social.networking.service", "com.liferay.journal.content.asset.addon.entry.ratings", "com.liferay.social.activities.api", "com.liferay.dynamic.data.mapping.data.provider.web", "com.liferay.map.openstreetmap", "com.liferay.shopping.web", "com.liferay.frontend.js.metal.web", "com.liferay.portlet.configuration.icon.edit", "com.liferay.blogs.recent.bloggers.api", "com.liferay.dynamic.data.mapping.type.options", "com.liferay.trash.service", "com.liferay.websocket.whiteboard", "com.liferay.comment.page.comments.web", "com.liferay.flags.web", "com.liferay.adaptive.media.image.content.transformer", "com.liferay.blogs.item.selector.api", "com.liferay.adaptive.media.api", "com.liferay.portlet.configuration.icon.maximize", "com.liferay.document.library.repository.authorization.api", "com.liferay.frontend.image.editor.capability.contrast", "com.liferay.mail.reader.api", "com.liferay.wiki.editor.configuration", "com.liferay.mobile.device.rules.service", "com.liferay.blogs.api", "com.liferay.knowledge.base.web", "com.liferay.adaptive.media.image.taglib", "com.liferay.item.selector.web", "com.liferay.product.navigation.user", "com.liferay.frontend.editor.simple.web", "com.liferay.message.boards.layout.set.prototype", "com.liferay.frontend.js.polyfill.babel.web", "com.liferay.expando.taglib", "com.liferay.xsl.content.web", "com.bmw.intranet.ci.startup.activator", "com.liferay.push.notifications.sender.apple", "com.liferay.loan.calculator.web", "com.liferay.announcements.api", "com.liferay.document.library.service", "com.liferay.site.navigation.directory.web", "com.liferay.portlet.configuration.icon.help", "com.liferay.journal.api", "com.liferay.monitoring.web", "com.liferay.dynamic.data.lists.form.web", "com.liferay.site.admin.web", "com.liferay.dynamic.data.lists.web", "com.liferay.knowledge.base.api", "com.liferay.asset.web", "com.liferay.layout.item.selector.web", "com.liferay.wiki.engine.text", "com.liferay.asset.browser.web", "com.liferay.layout.prototype.impl", "com.liferay.dynamic.data.mapping.form.evaluator", "com.liferay.microblogs.service", "com.liferay.roles.admin.web", "com.liferay.adaptive.media.image.service", "com.liferay.message.boards.service", "com.liferay.portlet.display.template", "com.liferay.captcha.taglib", "com.liferay.frontend.js.bundle.config.extender", "com.liferay.youtube.web", "com.liferay.translator.web", "com.liferay.staging.security", "com.liferay.item.selector.url.web", "com.liferay.application.list.user.personal.site.permissions", "com.liferay.sync.web", "com.liferay.frontend.css.rtl.servlet", "com.liferay.social.requests.web", "com.liferay.dynamic.data.mapping.type.radio", "com.liferay.marketplace.deployer", "com.liferay.adaptive.media.blogs.item.selector.web", "com.liferay.xstream.configurator.api", "com.liferay.layout.impl", "org.tukaani.xz", "com.liferay.configuration.admin.web", "com.liferay.document.library.repository.search", "com.liferay.journal.content.search.web", "com.liferay.asset.publisher.layout.prototype", "com.liferay.social.group.statistics.web", "com.liferay.twitter.service", "com.liferay.invitation.invite.members.service", "com.liferay.blogs.layout.prototype", "com.bmw.hooks.layout.admin.web", "com.liferay.exportimport.resources.importer", "com.liferay.upload.web", "com.liferay.marketplace.service", "com.liferay.roles.admin.impl", "com.liferay.my.account.web", "com.liferay.push.notifications.web", "com.liferay.mobile.device.rules.web", "com.liferay.screens.api", "com.liferay.adaptive.media.blogs.web", "com.liferay.calendar.web", "com.liferay.wiki.engine.input.editor.common", "com.liferay.dynamic.data.lists.service", "com.liferay.asset.entry.query.processor.custom.user.attributes", "com.liferay.ratings.api", "com.liferay.product.navigation.control.menu.theme.contributor", "com.liferay.layout.type.controller.control.panel", "com.liferay.journal.service", "com.liferay.layout.set.prototype.api", "com.liferay.announcements.web", "com.liferay.dynamic.data.mapping.form.renderer", "com.liferay.product.navigation.taglib", "com.liferay.social.user.statistics.api", "com.bmw.hooks.jaaf.autologin", "com.liferay.wiki.layout.prototype", "com.liferay.dynamic.data.mapping.taglib", "com.liferay.adaptive.media.demo.data.creator.impl", "com.liferay.frontend.editor.alloyeditor.accessibility.web", "com.liferay.frontend.editor.alloyeditor.web", "com.liferay.unit.converter.web", "com.liferay.social.networking.api", "com.liferay.wiki.web", "com.liferay.blogs.item.selector.web", "com.liferay.wiki.api", "com.liferay.frontend.editor.tinymce.web", "com.liferay.invitation.invite.members.api", "com.liferay.marketplace.api", "com.liferay.adaptive.media.image.api", "com.liferay.layout.item.selector.api", "com.liferay.password.policies.admin.api", "com.liferay.dynamic.data.mapping.data.provider", "com.liferay.rss.util", "com.liferay.dynamic.data.mapping.form.values.factory", "com.liferay.portlet.configuration.web", "com.liferay.petra.io.delta", "com.liferay.dynamic.data.mapping.type.key.value", "com.liferay.journal.item.selector.api", "com.liferay.message.boards.api", "com.liferay.item.selector.api", "com.liferay.blogs.web", "com.liferay.image.uploader.web", "com.liferay.chat.api", "com.liferay.blogs.editor.configuration", "com.liferay.dynamic.data.mapping.type.checkbox", "com.liferay.password.generator.web", "com.liferay.server.admin.web", "com.liferay.rss.api", "com.liferay.asset.categories.service", "com.liferay.user.groups.admin.api", "com.mercatis.osgi.web", "com.liferay.dynamic.data.mapping.form.field.type", "com.liferay.imageio.plugins", "com.liferay.adaptive.media.image.item.selector.impl", "com.liferay.web.proxy.web", "com.liferay.mentions.web", "com.liferay.product.navigation.control.panel", "com.liferay.comment.api", "com.liferay.staging.configuration.web", "com.liferay.polls.service", "com.liferay.shopping.api", "com.liferay.asset.taglib", "com.liferay.password.policies.admin.impl", "com.liferay.wiki.engine.html", "com.liferay.frontend.image.editor.capability.brightness", "com.liferay.license.manager.web", "com.liferay.frontend.taglib.soy", "com.liferay.site.navigation.taglib", "com.liferay.knowledge.base.service", "com.liferay.message.boards.comment", "com.liferay.frontend.theme.unstyled", "com.liferay.product.navigation.simulation.web", "com.liferay.journal.content.asset.addon.entry.comments", "com.liferay.wiki.engine.mediawiki", "com.liferay.frontend.editor.alloyeditor.link.browse.web", "com.liferay.bookmarks.web", "com.liferay.ratings.service", "com.liferay.exportimport.web", "com.liferay.message.boards.parser.bbcode", "com.liferay.shopping.service", "com.liferay.login.authentication.openid.web", "com.liferay.map.google.maps", "com.liferay.network.utilities.web", "com.liferay.frontend.theme.contributor.extender", "com.liferay.dynamic.data.mapping.type.password", "com.liferay.journal.editor.configuration", "com.mercatis.osgi.api", "com.liferay.site.navigation.language.api", "com.liferay.marketplace.store.web", "com.liferay.document.library.repository.cmis.api", "com.liferay.microblogs.web", "com.liferay.site.memberships.web", "com.liferay.social.activities.web", "com.liferay.dynamic.data.mapping.validator", "com.liferay.weather.web", "com.liferay.portlet.configuration.icon.print", "com.liferay.dictionary.web", "com.liferay.adaptive.media.blogs.web.fragment", "com.liferay.adaptive.media.document.library", "com.liferay.staging.api", "com.liferay.product.navigation.simulation.api", "com.liferay.site.item.selector.api", "com.liferay.journal.content.asset.addon.entry.conversions", "com.liferay.adaptive.media.journal.editor.configuration", "com.liferay.users.admin.impl", "com.liferay.users.admin.web", "com.liferay.frontend.js.spa.web", "com.liferay.document.library.repository.external.api", "com.liferay.frontend.image.editor.capability.crop", "com.liferay.frontend.theme.styled", "com.liferay.push.notifications.sender.android", "com.liferay.layout.type.controller.shared.portlet", "com.liferay.login.web", "com.liferay.frontend.js.loader.modules.extender.api", "com.liferay.staging.processes.web", "com.liferay.document.library.google.docs", "com.liferay.item.selector.criteria.api", "com.liferay.microsoft.translator", "com.liferay.twitter.web", "com.liferay.twitter.api", "com.liferay.asset.categories.admin.web", "com.liferay.calendar.service", "com.liferay.site.navigation.menu.web", "com.liferay.journal.content.asset.addon.entry.print", "com.liferay.frontend.image.editor.integration.document.library", "com.liferay.dynamic.data.mapping.type.text", "com.liferay.portlet.configuration.icon.refresh", "com.liferay.google.maps.web", "com.liferay.knowledge.base.editor.configuration", "com.liferay.adaptive.media.image.js.web", "com.liferay.petra.doulos", "com.liferay.frontend.js.web", "com.liferay.asset.tags.navigation.api", "com.liferay.dynamic.data.mapping.service", "com.liferay.gogo.shell.web", "com.liferay.frontend.theme.favicon.servlet", "com.liferay.alloy.mvc", "com.liferay.notifications.web", "com.liferay.product.navigation.site.administration", "com.liferay.application.list.taglib", "com.liferay.layout.set.prototype.impl", "com.liferay.calendar.api", "com.liferay.contacts.api", "com.liferay.adaptive.media.document.library.item.selector.web", "com.liferay.polls.web", "com.liferay.hello.soy.navigation.web", "com.liferay.adaptive.media.image.web", "com.liferay.layout.admin.web", "com.liferay.journal.item.selector.web", "com.liferay.dynamic.data.mapping.type.validation", "com.liferay.asset.service", "com.liferay.dynamic.data.mapping.type.captcha", "com.liferay.marketplace.app.manager.web", "com.liferay.mentions.service", "com.liferay.product.navigation.control.menu.web", "com.liferay.user.groups.admin.impl", "com.liferay.external.data.source.test.api", "com.liferay.wiki.engine.lang", "com.liferay.screens.service", "com.liferay.plugins.admin.web", "com.liferay.flags.service", "com.liferay.dynamic.data.mapping.type.editor", "com.bmw.portal.remoteuser.servlet.filter", "com.liferay.hello.velocity.web", "com.liferay.layout.prototype.web", "com.liferay.mail.reader.web", "com.liferay.adaptive.media.image.item.selector.api", "com.liferay.rss.web", "com.liferay.portlet.configuration.css.web", "com.liferay.iframe.web", "com.liferay.adaptive.media.content.transformer.api", "com.liferay.site.teams.web", "com.liferay.blogs.recent.bloggers.web", "com.liferay.petra.model.adapter", "com.liferay.wsrp.web", "com.liferay.journal.web", "com.liferay.adaptive.media.document.library.thumbnails", "com.liferay.map.common", "com.liferay.roles.admin.api", "com.liferay.frontend.js.aui.web", "com.liferay.push.notifications.sender.firebase", "com.liferay.wsrp.service", "com.liferay.social.privatemessaging.service", "com.liferay.login.authentication.facebook.connect.web", "com.liferay.dynamic.data.mapping.lang", "com.liferay.adaptive.media.document.library.web", "com.liferay.adaptive.media.journal.web", "com.liferay.trash.taglib", "com.liferay.recent.documents.web", "com.liferay.web.form.web", "com.liferay.users.admin.api", "com.liferay.frontend.js.node.shims", "com.liferay.portlet.display.template.web", "com.liferay.asset.categories.navigation.api", "com.liferay.layout.taglib", "com.liferay.frontend.taglib", "com.liferay.frontend.editor.ckeditor.web", "com.liferay.frontend.image.editor.capability.saturation", "com.liferay.flags.api", "com.liferay.bookmarks.api", "com.liferay.portlet.configuration.icon.close", "com.liferay.asset.categories.navigation.web", "com.liferay.amazon.rankings.web", "com.liferay.journal.terms.of.use", "com.liferay.product.navigation.product.menu.web", "com.liferay.asset.tags.compiler.web", "com.liferay.layout.type.controller.node", "com.liferay.document.library.repository.cmis.impl", "com.liferay.dynamic.data.mapping.web", "com.liferay.wiki.navigation.web", "com.liferay.frontend.image.editor.capability.rotate", "com.liferay.flags.taglib", "com.liferay.wiki.engine.jspwiki", "com.liferay.roles.selector.web", "com.liferay.password.policies.admin.web", "com.liferay.document.library.item.selector.web", "com.liferay.dynamic.data.mapping.api", "com.liferay.product.navigation.simulation.theme.contributor", "com.maxmind.geoip.api", "com.liferay.social.privatemessaging.web", "com.liferay.captcha.api", "com.liferay.product.navigation.product.menu.theme.contributor", "com.liferay.layout.set.prototype.web", "com.liferay.portlet.configuration.icon.locator.api", "com.mercatis.osgi.service", "com.liferay.product.navigation.user.personal.bar.web", "com.liferay.nested.portlets.web", "com.liferay.frontend.taglib.util.freemarker.contributor", "com.liferay.asset.tags.api", "com.liferay.mail.reader.service", "com.liferay.message.boards.editor.configuration", "com.liferay.events.display.web", "com.liferay.trash.web", "com.liferay.frontend.image.editor.web", "com.liferay.frontend.js.soyutils.web", "com.liferay.invitation.web", "com.liferay.dynamic.data.mapping.type.paragraph", "com.liferay.sync.api", "com.liferay.sync.service", "com.liferay.push.notifications.sender.sms", "com.liferay.hello.world.web", "com.liferay.dynamic.data.mapping.form.values.query", "com.liferay.social.privatemessaging.api", "com.liferay.dynamic.data.mapping.type.date", "com.liferay.journal.lang", "com.liferay.contacts.service", "com.liferay.message.boards.web", "com.liferay.wysiwyg.web", "com.liferay.directory.web", "com.liferay.push.notifications.sender.microsoft", "com.liferay.push.notifications.service", "com.liferay.portlet.configuration.icon.minimize", "com.liferay.comment.editor.configuration", "com.liferay.frontend.js.loader.modules.extender", "com.liferay.staging.bar.web", "com.liferay.hello.soy.web", "com.liferay.dynamic.data.mapping.type.select", "com.liferay.bookmarks.service", "com.liferay.asset.tags.navigation.web", "com.liferay.frontend.compatibility.ie", "com.liferay.site.navigation.language.web", "com.liferay.upload.api", "com.liferay.knowledge.base.item.selector.web", "com.liferay.adaptive.media.blogs.editor.configuration", "com.liferay.site.browser.web", "com.liferay.map.api", "com.liferay.comment.ratings.definition", "com.liferay.portlet.configuration.icon.edit.defaults", "com.liferay.product.navigation.control.menu.api", "com.liferay.application.list.my.account.permissions", "com.liferay.item.selector.editor.configuration", "com.liferay.wiki.engine.creole", "com.bmw.hooks.search", "com.liferay.currency.converter.web", "com.liferay.polls.api", "com.liferay.application.list.api", "com.liferay.dynamic.data.mapping.type.checkbox.multiple", "com.liferay.site.item.selector.web", "com.liferay.wsrp.service-wsdd", "com.liferay.document.library.api", "com.liferay.social.activity.web", "com.liferay.staging.taglib", "com.liferay.knowledge.base.item.selector.api", "com.liferay.map.taglib", "com.liferay.ip.geocoder.sample.web", "com.liferay.invitation.invite.members.web", "com.liferay.chat.service", "com.liferay.frontend.image.editor.api", "com.liferay.asset.tags.service", "com.liferay.dynamic.data.lists.api", "com.liferay.adaptive.media.web", "com.liferay.item.selector.taglib", "com.bmw.hooks.siteminder.logout", "com.liferay.portlet.configuration.toolbar.contributor.locator.api", "com.liferay.journal.content.asset.addon.entry.locales", "com.liferay.asset.display.web", "com.liferay.site.navigation.site.map.web", "com.liferay.frontend.css.common", "com.liferay.comment.web", "com.liferay.frontend.image.editor.capability.resize", "com.liferay.social.user.statistics.web", "com.liferay.product.navigation.simulation.device", "com.bmw.portal.cluster.gms", "com.liferay.flash.web", "com.liferay.social.activity.api", "com.bmw.intranet.ci.custompermissions.portlet", "com.liferay.comment.sanitizer", "com.liferay.asset.publisher.web", "com.liferay.login.authentication.google.web", "com.liferay.wsrp.api", "com.liferay.mobile.device.rules.api", "com.liferay.knowledge.base.markdown.converter", "com.liferay.layout.prototype.api", "com.liferay.journal.ratings.definition"],
            war: ["user-profile-theme", "com.bmw.intranet.ci.layouttpl.war", "powwow-portlet", "tasks-portlet", "user-dashboard-theme", "classic-theme", "admin-theme", "com.bmw.intranet.ci.theme", "social-bookmarks-hook", "frontend-columns-layouttpl", "opensocial-portlet"],
            portal: ["com.liferay.portal.lock.service", "com.liferay.portal.settings.authentication.google.web", "com.liferay.portal.workflow.kaleo.runtime.api", "com.liferay.portal.settings.authentication.ntlm.web", "com.liferay.portal.monitoring", "com.liferay.portal.osgi.debug.spring.extender", "com.liferay.portal.security.wedeploy.auth.api", "com.liferay.portal.messaging", "com.liferay.portal.workflow.definition.link.web", "com.liferay.portal.workflow.task.web", "com.liferay.portal.security.sso.facebook.connect", "com.liferay.portal.store.file.system", "com.liferay.portal.search.elasticsearch6.api", "com.liferay.portal.security.sso.opensso", "com.liferay.portal.mobile.device.recognition.api", "com.liferay.portal.template.xsl", "com.liferay.portal.security.audit.wiring", "com.liferay.portal.scripting.beanshell", "com.liferay.portal.workflow.kaleo.service", "com.liferay.portal.template.velocity", "com.liferay.portal.search.api", "com.liferay.portal.workflow.lang", "com.liferay.portal.cache.ehcache.provider", "com.liferay.portal.scripting.python", "com.liferay.portal.workflow.kaleo.definition.impl", "com.liferay.portal.security.service.access.policy.api", "com.liferay.portal.dao.orm.custom.sql", "com.liferay.portal.weblogic.support", "com.liferay.portal.store.ignore.duplicates.wrapper", "com.liferay.portal.settings.web", "com.liferay.portal.spring.extender", "com.liferay.portal.search.elasticsearch6.impl", "com.liferay.portal.configuration.extender", "com.liferay.portal.verify.extender", "com.liferay.portal.mobile.device.detection.fiftyonedegrees", "com.liferay.portal.security.sso.token.api", "com.liferay.portal.cache.single", "com.liferay.portal.jmx.api", "com.liferay.portal.store.safe.file.name.wrapper", "com.liferay.portal.upgrade.api", "com.liferay.portal.security.service.access.policy.service", "com.liferay.portal.license.deployer", "com.liferay.portal.store.db", "com.liferay.portal.settings.authentication.cas.web", "com.liferay.portal.search.web", "javax.validation.api", "com.liferay.portal.template.freemarker", "com.liferay.portal.lock.api", "com.liferay.portal.remote.soap.extender.api", "com.liferay.portal.scheduler.single", "com.liferay.portal.compound.session.id", "com.liferay.portal.language.servlet.filter", "com.liferay.portal.security.sso.cas.api", "com.liferay.portal.template.soy.context.contributor", "com.liferay.portal.remote.rest.extender", "com.liferay.portal.security.sso.openid", "com.liferay.portal.scripting.javascript", "com.liferay.portal.rules.engine.wiring", "com.liferay.portal.background.task.api", "com.liferay.portal.instances.api", "com.liferay.portal.cache.ehcache.multiple", "com.liferay.portal.configuration.metatype.definitions.equinox", "com.liferay.portal.settings.lang", "com.liferay.portal.security.auto.login", "com.liferay.portal.search", "com.liferay.portal.security.antisamy", "com.liferay.portal.remote.axis.extender", "com.liferay.portal.store.jcr", "com.liferay.portal.scripting.ruby", "com.liferay.portal.security.wedeploy.auth.service", "com.liferay.portal.scheduler", "com.liferay.portal.configuration.module.configuration", "com.liferay.portal.security.ldap", "com.liferay.portal.cache", "com.liferay.portal.security.auth.verifier", "org.codehaus.stax2", "com.liferay.portal.scripting.executor", "com.liferay.portal.security.exportimport.api", "com.liferay.portal.configuration.settings", "com.liferay.portal.scripting.groovy", "com.liferay.portal.store.cmis", "com.liferay.portal.security.sso.ntlm.api", "com.liferay.portal.upgrade.impl", "com.liferay.portal.workflow.kaleo.runtime.scripting.impl", "com.liferay.portal.security.sso.opensso.api", "com.liferay.portal.custom.jsp.bag.api", "com.liferay.portal.output.stream.container.api", "com.liferay.portal.settings.authentication.ldap.web", "com.liferay.portal.init.servlet.filter", "com.liferay.portal.remote.json.web.service.extender", "com.liferay.portal.workflow.kaleo.api", "com.liferay.portal.workflow.kaleo.runtime.impl", "com.liferay.portal.instance.lifecycle", "com.liferay.portal.scheduler.quartz", "com.ctc.wstx", "com.liferay.portal.cluster.single", "com.liferay.portal.pop.notifications", "com.liferay.portal.mobile.device.detection.fiftyonedegrees.api", "com.liferay.portal.remote.http.tunnel.extender", "com.liferay.portal.executor", "com.liferay.portal.workflow.definition.web", "com.liferay.portal.settings.authentication.facebook.connect.web", "com.liferay.portal.security.wedeploy.auth.web", "com.liferay.portal.remote.cxf.jaxrs.common", "com.liferay.portal.security.sso.facebook.connect.api", "com.liferay.portal.security.sso.google", "com.liferay.portal.output.stream.container", "com.liferay.portal.settings.api", "com.liferay.portal.security.sso.ntlm", "com.liferay.portal.instances.web", "com.liferay.portal.background.task.service", "com.liferay.portal.security.service.access.policy.web", "com.liferay.portal.search.web.api", "com.liferay.portal.security.sso.token.impl", "com.liferay.portal.security.sso.google.api", "com.liferay.portal.osgi.debug.declarative.service", "com.liferay.portal.workflow.kaleo.runtime.integration.impl", "com.liferay.portal.remote.cxf.common", "com.liferay.portal.security.sso.openid.api", "com.liferay.portal.cache.ehcache", "com.liferay.portal.portlet.bridge.soy", "com.liferay.portal.security.sso.cas", "com.liferay.portal.language.extender", "com.liferay.portal.instances.service", "com.liferay.portal.reports.engine.api", "com.liferay.portal.search.facet", "com.liferay.portal.background.task.web", "com.liferay.portal.workflow.instance.web", "com.liferay.portal.scripting.api", "com.liferay.portal.workflow.kaleo.definition.api", "com.liferay.portal.security.audit.api", "com.liferay.portal.remote.soap.extender.impl", "com.liferay.portal.configuration.metatype.definitions.annotations", "com.liferay.portal.settings.authentication.opensso.web", "com.liferay.portal.jmx", "com.liferay.portal.settings.authentication.openid.web", "com.liferay.portal.configuration.cluster", "com.liferay.portal.rules.engine.api", "com.liferay.portal.scheduler.multiple", "com.liferay.portal.template.soy", "com.liferay.portal.store.s3"],
            static: ["com.liferay.portal.osgi.web.portlet.tracker", "com.liferay.modules.compat", "com.liferay.portal.configuration.persistence", "com.liferay.portal.component.blacklist.api", "javax.el", "com.liferay.portal.profile.api", "com.liferay.portal.component.blacklist.impl", "org.eclipse.equinox.http.servlet", "com.liferay.portal.osgi.web.wab.generator", "org.apache.felix.gogo.command", "com.liferay.portal.target.platform.indexer", "com.liferay.portal.bundle.blacklist", "javax.servlet.jsp.jstl", "javax.servlet.jsp-api", "org.eclipse.equinox.console", "org.apache.felix.dependencymanager", "com.liferay.portal.profile.impl", "org.osgi.service.http", "org.apache.commons.fileupload", "com.liferay.osgi.felix.file.install.configuration.cleaner", "javax.servlet.jsp.jstl-api", "org.apache.felix.gogo.shell", "org.apache.commons.io", "com.liferay.portal.configuration.metatype", "com.liferay.portal.osgi.web.servlet.jsp.compiler", "com.liferay.portal.classloader.tracker", "org.apache.felix.scr", "com.liferay.portal.osgi.web.wab.extender", "org.apache.felix.gogo.runtime", "com.liferay.portal.log4j.extender", "org.apache.felix.fileinstall", "com.liferay.osgi.util", "org.eclipse.equinox.metatype", "com.liferay.portal.lpkg.deployer", "com.liferay.portal.osgi.web.wab.reference.support", "com.liferay.portal.osgi.web.servlet.context.helper", "org.apache.felix.configadmin", "org.apache.felix.bundlerepository", "org.osgi.service.metatype", "org.apache.felix.dependencymanager.shell", "org.apache.felix.eventadmin"],
            compat: ["com.liferay.modules.compat.data"]
        };

        this.dircolors = {
            none: "grey",
            core: "red",
            compat: "orange",
            portal: "magenta",
            static: "brown",
            war: "blue",
            modules: "green",
        };

        let dirnames = Object.keys(this.dirs);

        for (let i = 0; i < dirnames.length; i++) {
            let dir = this.dirs[dirnames[i]];
            for (let j = 0; j < dir.length; j++) {
                let bundlename = dir[j];
                this.bundledirs[bundlename] = dirnames[i];
            }
        }
    }

}

// Register component
Soy.register(DependencyVisualization, templates);

export default DependencyVisualization;