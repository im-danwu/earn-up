import { RouteComponentProps } from 'react-router-dom'
import update from 'immutability-helper'
import React, { useEffect, useState } from 'react'
import {
  Form,
  Button,
  Checkbox,
  Divider,
  Grid,
  Header,
  Icon,
  Image,
  Loader
} from 'semantic-ui-react'

import {
  createReward,
  deleteReward,
  getRewards,
  redeemReward
} from '../api/rewards-api'
import Auth from '../auth/Auth'
import { Reward } from '../types/Reward'
import { useAccount } from '../state/accountState'

interface RewardsProps {
  auth: Auth
  history: RouteComponentProps["history"]
}

export const Rewards: React.FunctionComponent<RewardsProps> = props => {
  const { account, handleNewBalance } = useAccount()
  const { balance } = account

  const [rewards, setRewards] = useState<Reward[]>([])
  const [newRewardName, setNewRewardName] = useState('')
  const [newRewardCost, setNewRewardCost] = useState(0)
  const [loadingRewards, setLoadingRewards] = useState(true)

  const { auth } = props

  useEffect(() => {
    async function loadRewards() {
      try {
        const rewards = await getRewards(auth.getIdToken())
        setRewards(rewards)
        setLoadingRewards(false)
      } catch (e) {
        alert(`Failed to fetch rewards: ${e.message}`)
      }
    }

    loadRewards()
  }, [])

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNewRewardName(event.target.value)
  }

  const handleCostChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target
    const asNumber = Number(value)
    if (!isNaN(asNumber)) {
      setNewRewardCost(Number(value))
    }
  }

  const onEditButtonClick = (rewardId: string) => {
    const { history } = props
    history.push(`/rewards/${rewardId}/edit`)
  }

  const onRewardCreate = async () => {
    try {
      const newReward = await createReward(auth.getIdToken(), {
        name: newRewardName,
        cost: newRewardCost
      })
      setRewards([...rewards, newReward])
      setNewRewardName('')
      setNewRewardCost(0)
    } catch (err) {
      console.log('err :', err)
      alert('Reward creation failed')
    }
  }

  const onRewardDelete = async (rewardId: string) => {
    try {
      await deleteReward(auth.getIdToken(), rewardId)
      setRewards(rewards.filter(reward => reward.rewardId != rewardId))
    } catch (e) {
      console.log('e :', e)
      alert('Reward deletion failed')
    }
  }

  const onRewardCheck = async (rewardId: string) => {
    const pos = rewards.findIndex(r => r.rewardId === rewardId)
    const reward = rewards[pos]

    if (!reward) return // NB: should never happen

    if (balance === null || reward.cost > balance) {
      return alert('This reward costs too much')
    }

    try {
      setLoadingRewards(true)
      const newBalance = await redeemReward(
        auth.getIdToken(),
        reward.rewardId,
        !reward.redeemed
      )
      setRewards(
        update(rewards, {
          [pos]: { redeemed: { $set: !reward.redeemed } }
        })
      )
      handleNewBalance(newBalance)
    } catch (e) {
      console.log('e :', e)
      alert('Reward update failed')
    }
    setLoadingRewards(false)
  }

  const renderLoading = () => (
    <Grid.Row>
      <Loader indeterminate active inline="centered">
        Loading rewards...
      </Loader>
    </Grid.Row>
  )

  const renderRewardsList = () => {
    const [redeemed, unredeemed] = rewards.reduce<Reward[][]>(
      (lists, reward) => {
        lists[reward.redeemed ? 0 : 1].push(reward)
        return lists
      },
      [[], []]
    )
    return (
      <>
        <Header as="h2">Rewards List</Header>
        <Grid padded>
          {[
            ...unredeemed.sort((a, b) => a.cost - b.cost),
            ...redeemed.sort((a, b) => a.cost - b.cost)
          ].map((reward, pos) => {
            return (
              <Grid.Row key={reward.rewardId}>
                <Grid.Column width={1} verticalAlign="middle">
                  <Checkbox
                    onChange={() => onRewardCheck(reward.rewardId)}
                    checked={reward.redeemed}
                  />
                </Grid.Column>
                <Grid.Column
                  width={reward.redeemed ? 3 : 10}
                  verticalAlign="middle"
                >
                  {reward.name}
                </Grid.Column>
                {reward.redeemed && (
                  <Grid.Column width={7} verticalAlign="middle">
                    Redeemed <Icon name="trophy" />
                  </Grid.Column>
                )}
                <Grid.Column width={3} floated="right">
                  {reward.cost}
                </Grid.Column>
                <Grid.Column width={1} floated="right">
                  <Button
                    icon
                    color="blue"
                    onClick={() => onEditButtonClick(reward.rewardId)}
                  >
                    <Icon name="pencil" />
                  </Button>
                </Grid.Column>
                <Grid.Column width={1} floated="right">
                  <Button
                    icon
                    color="red"
                    onClick={() => onRewardDelete(reward.rewardId)}
                  >
                    <Icon name="delete" />
                  </Button>
                </Grid.Column>
                {reward.attachmentUrl && (
                  <Image
                    src={reward.attachmentUrl}
                    size="small"
                    wrapped
                    onError={(i: any) => (i.target.src = '')}
                  />
                )}
                <Grid.Column width={16}>
                  <Divider />
                </Grid.Column>
              </Grid.Row>
            )
          })}
        </Grid>
      </>
    )
  }

  const renderCreateRewardForm = () => {
    return (
      <>
        <Grid.Row width={16}>
          <Divider />
          <Header as="h2">New Reward Form</Header>
        </Grid.Row>
        <Grid.Row>
          <Grid.Column width={16}>
            <Form>
              <Form.Group widths="equal">
                <Form.Field
                  label="Reward name"
                  placeholder="Treat yo self"
                  onChange={handleNameChange}
                  control="input"
                  value={newRewardName}
                />
                <Form.Field
                  label="Reward cost"
                  onChange={handleCostChange}
                  control="input"
                  value={newRewardCost}
                />
              </Form.Group>
              <Form.Button
                type="submit"
                icon
                labelPosition="left"
                onClick={onRewardCreate}
                color="teal"
              >
                <Icon name="add" />
                New reward
              </Form.Button>
            </Form>
          </Grid.Column>
          <Grid.Column width={16}>
            <Divider />
          </Grid.Column>
        </Grid.Row>
      </>
    )
  }

  return (
    <div>
      {loadingRewards ? (
        renderLoading()
      ) : (
        <>
          {renderCreateRewardForm()}
          {renderRewardsList()}
        </>
      )}
    </div>
  )
}
