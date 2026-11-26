require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name = 'BeanconquerorTextRecognition'
  s.version = package['version']
  s.summary = package['description']
  s.license = package['license']
  s.homepage = 'https://github.com/graphefruit/Beanconqueror'
  s.author = package['author']
  s.source = { :git => 'https://github.com/graphefruit/Beanconqueror.git' }
  s.source_files = 'ios/Sources/**/*.swift'
  s.ios.deployment_target = '17.0'
  s.dependency 'Capacitor'
  s.frameworks = 'Vision'
  s.swift_version = '5.9'
end
