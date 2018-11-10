package com.mercatis.bundle.dependency.visualization.portlet.action;

import static org.osgi.framework.namespace.PackageNamespace.PACKAGE_NAMESPACE;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import javax.portlet.PortletException;
import javax.portlet.RenderRequest;
import javax.portlet.RenderResponse;

import org.osgi.framework.Bundle;
import org.osgi.framework.FrameworkUtil;
import org.osgi.framework.wiring.BundleWire;
import org.osgi.framework.wiring.BundleWiring;
import org.osgi.service.component.annotations.Component;

import com.liferay.portal.kernel.json.JSONException;
import com.liferay.portal.kernel.json.JSONFactoryUtil;
import com.liferay.portal.kernel.json.JSONObject;
import com.liferay.portal.kernel.json.JSONSerializer;
import com.liferay.portal.kernel.log.Log;
import com.liferay.portal.kernel.log.LogFactoryUtil;
import com.liferay.portal.kernel.portlet.bridges.mvc.MVCRenderCommand;
import com.liferay.portal.kernel.template.Template;
import com.liferay.portal.kernel.util.WebKeys;
import com.mercatis.bundle.dependency.visualization.constants.DependencyVisualizationPortletKeys;

@Component(
    immediate = true,
    property = {
        "javax.portlet.name=" + DependencyVisualizationPortletKeys.DependencyVisualization,
        "mvc.command.name=/",
    },
    service = MVCRenderCommand.class
)
public class DependencyVisualizationPortletMVCRenderCommand implements MVCRenderCommand {

    private static final Log LOG = LogFactoryUtil.getLog(DependencyVisualizationPortletMVCRenderCommand.class);

    @Override
    public String render(RenderRequest renderRequest, RenderResponse renderResponse) throws PortletException {

        // get the full list of bundles and their dependecies
        List<MyBundle> myBundles = assembleMyBundles();

        // create a map for easier handling in js
        Map<Long, MyBundle> bundlesMap = new HashMap<>();
        for (MyBundle myBundle : myBundles) {
            bundlesMap.put(myBundle.getId(), myBundle);
        }

        Template template = (Template) renderRequest.getAttribute(WebKeys.TEMPLATE);
//        template.put("bundles", bundlesMap);

        JSONSerializer jsonSerializer = JSONFactoryUtil.createJSONSerializer();
        jsonSerializer.exclude("javaClass");
        String bundlesString = jsonSerializer.serializeDeep(bundlesMap);

        try {
            JSONObject bundlesObject = JSONFactoryUtil.createJSONObject(bundlesString);
            template.put("bundles", bundlesObject);
        } catch (JSONException e) {
            LOG.error(e);
        }

        return "DependencyVisualization";
    }

    private List<MyBundle> assembleMyBundles() {
        List<MyBundle> myBundles = new ArrayList<>();

        // use OSGi specification to get all bundles in present OSGi Container
        final Bundle[] bundles = FrameworkUtil.getBundle(getClass()).getBundleContext().getBundles();

        for (Bundle bundle: bundles) {
            // MyBundle is a help class to simplify the data structure
            MyBundle myBundle = new MyBundle(bundle.getBundleId(), bundle.getSymbolicName(), bundle.getVersion().toString());

            // Adapt bundle to get it's wiring
            final BundleWiring bundleWiring = bundle.adapt(BundleWiring.class);

            // some bundles cannot be adapted to bundle wiring and need to be checked for NPE
            if (bundleWiring == null) {
                continue;
            }

            // From the wiring you can get the wires, e.g. the requited wires
            final List<BundleWire> wires = bundleWiring.getRequiredWires(PACKAGE_NAMESPACE);

            // collect all requited bundle id in a set
            final Set<Long> importsIds = new HashSet<>();

            for (BundleWire wire : wires) {
                importsIds.add(wire.getProvider().getBundle().getBundleId());
            }

            // optionally you can check the services which are used
//            final ServiceReference<?>[] servicesInUse = bundle.getServicesInUse();
//            if (servicesInUse != null) {
//                for (ServiceReference<?> serviceReference : servicesInUse) {
//                    final long bundleId = serviceReference.getBundle().getBundleId();
//                    if (bundle.getBundleId() != bundleId) {
//                        importsIds.add(bundleId);
//                    }
//
//                }
//            }

            // remove dependencies on org.eclipse.osgi to simplify the graph
            importsIds.remove(0L); // org.eclipse.osgi always has the id 0

            myBundle.setDependsOn(importsIds);
            myBundles.add(myBundle);
        }

        return myBundles;
    }

    // Help class to provide a simple data structure for bundles
    public class MyBundle {
        private Long id;
        private String name;
        private String version;
        private Set<Long> dependsOn;
        private Long group;

        public MyBundle(Long id, String name, String version) {
            this.id = id;
            this.name = name;
            this.version = version;
        }

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getVersion() {
            return version;
        }

        public void setVersion(String version) {
            this.version = version;
        }

        public Set<Long> getDependsOn() {
            return dependsOn;
        }

        public void setDependsOn(Set<Long> dependsOn) {
            this.dependsOn = dependsOn;
        }

        public Long getGroup() {
            return group;
        }

        public void setGroup(Long group) {
            this.group = group;
        }
    }

}
