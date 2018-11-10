package com.mercatis.bundle.dependency.visualization.portlet;

import javax.portlet.Portlet;

import org.osgi.service.component.annotations.Component;

import com.liferay.portal.portlet.bridge.soy.SoyPortlet;
import com.mercatis.bundle.dependency.visualization.constants.DependencyVisualizationPortletKeys;

/**
 * @author Sebastian Kaminski
 */
@Component(
    immediate = true,
    property = {
        "com.liferay.portlet.display-category=category.sample",
        "com.liferay.portlet.instanceable=true",
        "javax.portlet.display-name=Dependency Visualization Portlet",
        "com.liferay.portlet.css-class-wrapper=dependency-visualization",
        "com.liferay.portlet.header-portlet-javascript=/js/d3.js",
        "com.liferay.portlet.footer-portlet-css=/css/main.css",
        "javax.portlet.name=" + DependencyVisualizationPortletKeys.DependencyVisualization,
        "javax.portlet.resource-bundle=content.Language",
        "javax.portlet.security-role-ref=power-user,user"
    },
    service = Portlet.class
)
public class DependencyVisualizationPortlet extends SoyPortlet {
}