cmake_minimum_required(VERSION 3.16)
project(threecard_royale VERSION 0.1.1 LANGUAGES CXX)
include(GNUInstallDirs)
include(CMakePackageConfigHelpers)

add_library(threecard_royale INTERFACE)
add_library(threecard_royale::core ALIAS threecard_royale)
set_target_properties(threecard_royale PROPERTIES EXPORT_NAME core)
target_compile_features(threecard_royale INTERFACE cxx_std_17)
target_include_directories(threecard_royale INTERFACE
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
    $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>)

set(royale_top_level OFF)
if(CMAKE_SOURCE_DIR STREQUAL PROJECT_SOURCE_DIR)
    set(royale_top_level ON)
endif()
option(THREECARD_ROYALE_BUILD_TOOLS "Build JSON bridge and baseline example" ${royale_top_level})
option(THREECARD_ROYALE_BUILD_TESTS "Build native tests" ${royale_top_level})
if(THREECARD_ROYALE_BUILD_TOOLS)
    add_executable(royale-json-cpp examples/json_bridge.cpp)
    target_link_libraries(royale-json-cpp PRIVATE threecard_royale::core)
    add_executable(royale-baseline-cpp examples/baseline.cpp)
    target_link_libraries(royale-baseline-cpp PRIVATE threecard_royale::core)
endif()
if(THREECARD_ROYALE_BUILD_TESTS)
    enable_testing()
    add_executable(royale-native-tests tests/native_tests.cpp)
    target_link_libraries(royale-native-tests PRIVATE threecard_royale::core)
    add_test(NAME native-core COMMAND royale-native-tests)
    if(THREECARD_ROYALE_BUILD_TOOLS)
        add_test(NAME baseline-match COMMAND royale-baseline-cpp)
    endif()
endif()

install(TARGETS threecard_royale EXPORT threecard_royaleTargets)
install(DIRECTORY include/ DESTINATION ${CMAKE_INSTALL_INCLUDEDIR})
install(FILES LICENSE third_party/nlohmann-json.LICENSE DESTINATION ${CMAKE_INSTALL_DATADIR}/threecard_royale/licenses)
install(EXPORT threecard_royaleTargets NAMESPACE threecard_royale:: DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/threecard_royale)
file(WRITE "${CMAKE_CURRENT_BINARY_DIR}/threecard_royaleConfig.cmake"
    "include(\"\${CMAKE_CURRENT_LIST_DIR}/threecard_royaleTargets.cmake\")\n")
write_basic_package_version_file("${CMAKE_CURRENT_BINARY_DIR}/threecard_royaleConfigVersion.cmake"
    VERSION ${PROJECT_VERSION} COMPATIBILITY SameMajorVersion ARCH_INDEPENDENT)
install(FILES "${CMAKE_CURRENT_BINARY_DIR}/threecard_royaleConfig.cmake"
    "${CMAKE_CURRENT_BINARY_DIR}/threecard_royaleConfigVersion.cmake"
    DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/threecard_royale)
