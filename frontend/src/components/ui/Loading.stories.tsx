import type { Meta, StoryObj } from '@storybook/react'
import { Spinner, Skeleton, LoadingOverlay, SkeletonCard } from './Loading'
import { Card } from './Card'

const meta = {
  title: 'UI/Loading',
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta

export default meta

export const Spinners: StoryObj = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-4">Sizes</h3>
        <div className="flex items-center space-x-8">
          <div className="text-center">
            <Spinner size="small" />
            <p className="text-xs text-gray-500 mt-2">Small</p>
          </div>
          <div className="text-center">
            <Spinner size="medium" />
            <p className="text-xs text-gray-500 mt-2">Medium</p>
          </div>
          <div className="text-center">
            <Spinner size="large" />
            <p className="text-xs text-gray-500 mt-2">Large</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-4">Colors</h3>
        <div className="flex items-center space-x-8">
          <div className="text-center">
            <Spinner color="primary" />
            <p className="text-xs text-gray-500 mt-2">Primary</p>
          </div>
          <div className="text-center bg-gray-800 p-4 rounded">
            <Spinner color="white" />
            <p className="text-xs text-gray-300 mt-2">White</p>
          </div>
          <div className="text-center">
            <Spinner color="gray" />
            <p className="text-xs text-gray-500 mt-2">Gray</p>
          </div>
        </div>
      </div>
    </div>
  ),
}

export const Skeletons: StoryObj = {
  render: () => (
    <div className="space-y-8 w-96">
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-4">Text Skeleton</h3>
        <div className="space-y-2">
          <Skeleton variant="text" />
          <Skeleton variant="text" width="80%" />
          <Skeleton variant="text" width="60%" />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-4">Circular Skeleton</h3>
        <div className="flex items-center space-x-4">
          <Skeleton variant="circular" width={40} height={40} />
          <Skeleton variant="circular" width={60} height={60} />
          <Skeleton variant="circular" width={80} height={80} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-4">Rectangular Skeleton</h3>
        <div className="space-y-2">
          <Skeleton variant="rectangular" height={100} />
          <Skeleton variant="rectangular" height={60} />
          <Skeleton variant="rectangular" height={40} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-4">Animation Types</h3>
        <div className="space-y-2">
          <Skeleton variant="rectangular" animation="pulse" height={40} />
          <Skeleton variant="rectangular" animation="wave" height={40} />
          <Skeleton variant="rectangular" animation="none" height={40} />
        </div>
      </div>
    </div>
  ),
}

export const LoadingOverlayDemo: StoryObj = {
  render: () => (
    <div className="w-96">
      <LoadingOverlay isLoading={true} message="Loading content...">
        <Card>
          <h3 className="text-lg font-semibold mb-2">Content being loaded</h3>
          <p className="text-gray-600">
            This content is covered by a loading overlay. The overlay includes a spinner and an optional message.
          </p>
        </Card>
      </LoadingOverlay>
    </div>
  ),
}

export const SkeletonCardDemo: StoryObj = {
  render: () => (
    <div className="space-y-4 w-96">
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-4">Skeleton Card Variations</h3>
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard showAvatar={false} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={5} />
        </div>
      </div>
    </div>
  ),
}

export const RealWorldExample: StoryObj = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-4">Article List Loading State</h3>
        <div className="space-y-4 w-full max-w-2xl">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-start space-x-4">
                <Skeleton variant="rectangular" width={120} height={80} />
                <div className="flex-1 space-y-2">
                  <Skeleton variant="text" width="70%" height={24} />
                  <Skeleton variant="text" />
                  <Skeleton variant="text" width="90%" />
                  <div className="flex items-center space-x-4 mt-3">
                    <Skeleton variant="circular" width={24} height={24} />
                    <Skeleton variant="text" width={100} height={16} />
                    <Skeleton variant="text" width={80} height={16} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-4">Profile Loading State</h3>
        <div className="bg-white p-6 rounded-lg border border-gray-200 w-full max-w-md">
          <div className="flex items-center space-x-4 mb-6">
            <Skeleton variant="circular" width={80} height={80} />
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" width="60%" height={24} />
              <Skeleton variant="text" width="40%" height={16} />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton variant="text" />
            <Skeleton variant="text" />
            <Skeleton variant="text" width="80%" />
          </div>
          <div className="mt-6 flex space-x-2">
            <Skeleton variant="rectangular" width={100} height={36} />
            <Skeleton variant="rectangular" width={100} height={36} />
          </div>
        </div>
      </div>
    </div>
  ),
}
