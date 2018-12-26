/*
 * Copyright © 2018 Cask Data, Inc.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"); you may not
 *  use this file except in compliance with the License. You may obtain a copy of
 *  the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 *  WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 *  License for the specific language governing permissions and limitations under
 *  the License.
 */

package co.cask.cdap.security.store;

import co.cask.cdap.api.security.store.SecureStore;
import co.cask.cdap.api.security.store.SecureStoreData;
import co.cask.cdap.api.security.store.SecureStoreManager;
import co.cask.cdap.api.security.store.SecureStoreMetadata;
import co.cask.cdap.common.conf.CConfiguration;
import co.cask.cdap.securestore.spi.secret.Secret;
import co.cask.cdap.securestore.spi.SecretsManager;
import com.google.inject.Inject;
import com.google.inject.Singleton;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * TODO Check existence of namespace before performing any operations.
 */
@Singleton
public class WrappedSecureStore implements SecureStore, SecureStoreManager {
  private static final Logger LOG = LoggerFactory.getLogger(WrappedSecureStore.class);
  private SecretsManager secretsManager;

  @Inject
  public WrappedSecureStore(CConfiguration cConf) throws Exception {
    SecureStoreExtensionLoader secureStoreExtensionLoader = new SecureStoreExtensionLoader(cConf);
    Map<String, SecretsManager> all = secureStoreExtensionLoader.getAll();

    // get secure data manager from the classloader
    // TODO Make sure only one secure store is initialized. Decide that from the cConf variable
    for (Map.Entry<String, SecretsManager> entry : all.entrySet()) {
        secretsManager = entry.getValue();
        secretsManager.initialize(HashMap::new);
    }
  }

  /**
   *
   * @param namespace The namespace that this key belongs to.
   * @return
   * @throws Exception
   */
  @Override
  public Map<String, String> listSecureData(String namespace) throws Exception {
    Map<String, String> map = new HashMap<>();
    for (Secret data : secretsManager.getSecret(namespace)) {
      map.put(data.getMetadata().getName(), data.getMetadata().getDescription());
    }

    return map;
  }

  /**
   *
   * @param namespace The namespace that this key belongs to.
   * @param name Name of the data element.
   * @return
   * @throws Exception
   */
  @Override
  public SecureStoreData getSecureData(String namespace, String name) throws Exception {
    Optional<Secret> data = secretsManager.getSecret(namespace, name);
    if (data.isPresent()) {
      Secret secret = data.get();
      return new SecureStoreData(new SecureStoreMetadata(secret.getMetadata().getName(),
                                                         secret.getMetadata().getDescription(),
                                                         secret.getMetadata().getCreateTimeMs(),
                                                         secret.getMetadata().getProperties()),
                                 secret.getData());
    }

    throw new Exception("Secure Data not found.");
  }

  /**
   *
   * @param namespace The namespace that this key belongs to.
   * @param name This is the identifier that will be used to retrieve this element.
   * @param data The sensitive data that has to be securely stored
   * @param description User provided description of the entry.
   * @param properties associated with this element.
   * @throws Exception
   */
  @Override
  public void putSecureData(String namespace, String name, String data, String description,
                            Map<String, String> properties) throws Exception {
    secretsManager.storeSecret(namespace, name, data.getBytes(), description, properties);
  }

  /**
   *
   * @param namespace The namespace that this key belongs to.
   * @param name of the element to delete.
   * @throws Exception
   */
  @Override
  public void deleteSecureData(String namespace, String name) throws Exception {
    secretsManager.deleteSecret(namespace, name);
  }
}